
let groupName = document.querySelector("#groupName");
let sendMessageForm = document.querySelector("#messageSendForm");
let chatMessagesCtr = document.querySelector("#chatMessages");

window.addEventListener('DOMContentLoaded', ()=> {
    ws = new WebSocket(`ws://localhost:3000/ws`);
    ws.addEventListener('open', onConnectionOpen);
    ws.addEventListener('message', onMessageRecieved);
})

function onConnectionOpen() {
    const queryParams = getQueryParams();
    if (!queryParams.name || !queryParams.group) {
        window.location.href = "login.html";
        return;
    }
    groupName.innerHTML = queryParams.group;
    const event = {
        event: "join",
        groupName: queryParams.group,
        name: queryParams.name,
      };
    ws.send(JSON.stringify(event));
}

function onMessageRecieved(event) {
    console.log('message recieved');
    console.log(JSON.parse(event.data));

    event = JSON.parse(event.data);
    switch (event.event) {
      case "messageToClients": {
        const messageEl = document.createElement("div");
        messageEl.innerHTML = `<p class="message-text">${event.data.message}</p>`;
        chatMessagesCtr.appendChild(messageEl);

      } 
    }
}



function getQueryParams() {
    const search = window.location.search.substring(1);
    const pairs = search.split("&");
    const params = {};
    for (const pair of pairs) {
      const parts = pair.split("=");
      params[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
    }
    console.log('params',params);
    return params;
  }

  sendMessageForm.onsubmit = (ev) => {
    ev.preventDefault();
    submit();
  };

  
  function submit() {
    if (!editor) {
      return;
    }
    const content = editor.getContent();
    if (!content) {
      return;
    }
    const event = {
      event: "messageToServer",
      messageContent: content
    };
    ws.send(JSON.stringify(event));
    editor.resetContent();
  }

  function initEditor() {
    tinymce.init({
      selector: '#messageInput',
      plugins: 'autoresize link lists emoticons',
      toolbar: 'bold italic underline strikethrough | forecolor | numlist bullist | link blockquote emoticons',
      menubar: false,
      statusbar: false,
      width: '100%',
      toolbar_location: 'bottom',
      autoresize_bottom_margin: 0,
      contextmenu: false,
      setup: (ed) => {
        editor = ed;
      }
    });
  }
  
  initEditor();