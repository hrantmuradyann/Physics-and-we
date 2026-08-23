/* ============================================================================
   admin-login.js — sends the login form to the server.

   There is no password in this file. All it does is post what was typed to
   /admin/api/session and let the server decide. On success the server sets a
   signed, HttpOnly cookie that this script cannot read — which is the point:
   if the page ever had a scripting bug, the session still could not be stolen.
   ========================================================================== */
(function () {
  "use strict";

  var form = document.getElementById("login-form");
  var statusBox = document.getElementById("login-status");
  var submit = document.getElementById("login-submit");
  if (!form) return;

  function status(message, kind) {
    statusBox.textContent = message;
    statusBox.className = "admin-status" + (kind ? " " + kind : "");
  }

  // Where to go after signing in. Only a path on THIS site is ever accepted,
  // so a crafted ?next=https://evil.example link cannot bounce anyone away.
  function destination() {
    var next = new URLSearchParams(location.search).get("next") || "";
    if (!/^\/admin(\/|$)/.test(next)) return "/admin/";
    if (next.indexOf("//") !== -1 || next.indexOf("\\") !== -1) return "/admin/";
    return next;
  }

  // Shown when /admin/api/session is not there at all — which means the site is
  // being served by a plain file server rather than by Cloudflare Pages.
  function serverMissing() {
    statusBox.className = "admin-status error";
    statusBox.textContent = "";

    var what = document.createElement("p");
    what.textContent = "Այս էջը բացված է սովորական սերվերով, որտեղ մուտքի ստուգումը չի աշխատում։";

    var how = document.createElement("p");
    how.textContent = "Փակեք այն և տերմինալում գործարկեք՝";

    var cmd = document.createElement("code");
    cmd.className = "login__cmd";
    cmd.textContent = "npx wrangler pages dev .";

    var then = document.createElement("p");
    then.textContent = "Ապա բացեք՝ http://127.0.0.1:8788/admin/";

    statusBox.appendChild(what);
    statusBox.appendChild(how);
    statusBox.appendChild(cmd);
    statusBox.appendChild(then);
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var username = document.getElementById("login-username").value;
    var password = document.getElementById("login-password").value;
    if (!username || !password) {
      status("Լրացրե՛ք երկու դաշտն էլ։", "error");
      return;
    }

    submit.disabled = true;
    status("Ստուգվում է…", "info");

    fetch("/admin/api/session", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ username: username, password: password })
    })
      .then(function (response) {
        return response.json()
          .catch(function () { return {}; })
          .then(function (data) { return { status: response.status, data: data }; });
      })
      .then(function (result) {
        if (result.status === 200 && result.data.ok) {
          status("Բարի գալուստ։ Ուղղորդվում եք…", "ok");
          location.replace(destination());
          return;
        }
        submit.disabled = false;
        document.getElementById("login-password").value = "";
        if (result.status === 401) {
          status("Սխալ օգտանուն կամ գաղտնաբառ։", "error");
        } else if (result.status === 429) {
          status(result.data.error || "Չափազանց շատ փորձեր։", "error");
        } else if (result.status === 503) {
          status("Սերվերի կարգավորումը թերի է։ Տես Instructions/SECURITY.md։", "error");
        } else if (result.status === 404 || result.status === 501 || result.status === 405) {
          // The page is being served by a plain file server, which does not run
          // the Cloudflare Function that checks the password. Reporting a wrong
          // password here would send the reader off in completely the wrong
          // direction, so say what is actually missing.
          serverMissing();
        } else {
          status("HTTP " + result.status, "error");
        }
      })
      .catch(function () {
        submit.disabled = false;
        status("Ցանցի սխալ։ Փորձե՛ք կրկին։", "error");
      });
  });
})();
