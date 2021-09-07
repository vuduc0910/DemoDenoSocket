import { isWebSocketCloseEvent, WebSocket } from "https://deno.land/std/ws/mod.ts";
import { v4 } from "https://deno.land/std/uuid/mod.ts";


interface IUser {
  userId: string;
  name: string;
  groupName: string;
  ws: WebSocket
}
const usersMap = new Map<string, IUser>();
const groupsMap = new Map<string, IUser[]>();
interface IMessage {
  userId: string;
  name: string;
  message: string;
}
const messagesMap = new Map<string, IMessage[]>();

export default async function chat(ws: WebSocket) {
  const userId = v4.generate();
  for await (let data of ws) {
    const event = typeof data === "string" ? JSON.parse(data) : data;
    if (isWebSocketCloseEvent(data)) {
      leaveGroup(userId);
      break;
    }
    let user;
    switch (event.event) {
      case "join":
        user = {
          userId,
          name: event.name,
          groupName: event.groupName,
          ws,
        };
        usersMap.set(userId, user);
        const users = groupsMap.get(event.groupName) ?? [];
        users.push(user);
        groupsMap.set(event.groupName, users);
        emitNotification(user,  event.groupName,1)
        emitUserList(event.groupName);
        emitPreviousMessages(event.groupName, ws);
        break;
      case "message":
        user = usersMap.get(userId);
        const message = <IMessage>{
          userId,
          name: user?.name.replaceAll('+',' '),
          message: event.data,
        };
        const messages = messagesMap.get(user?.groupName ?? "") ?? [];
        messages.push(message);
        messagesMap.set(user?.groupName ?? "", messages);
        emitMessage(user?.groupName ?? "", message, userId);
        break;
    }
  }
}
function emitNotification(currentUser:IUser, groupName: string, flag: number){
  const users = groupsMap.get(groupName) || [];
  for (const user of users) {
    const event = {
      event: "notification",
      data: {
        name: user.userId === currentUser.userId ? 'you' : currentUser.name.replaceAll('+',' '),
        message: flag ? 'Joined the conversation' : 'Leaved the conversation'
      }
    }
    if(flag || user.userId !== currentUser.userId){
      user.ws.send(JSON.stringify(event));
    }
  }
}

function emitUserList(groupName: string) {
  const users = groupsMap.get(groupName) || [];
  for (const user of users) {
    const event = {
      event: "users",
      data: getDisplayUsers(groupName),
    };
    user.ws.send(JSON.stringify(event));
  }
}

function getDisplayUsers(groupName: string) {
  const users = groupsMap.get(groupName) || [];
  return users.map((u) => {
    return { userId: u.userId, name: u.name };
  });
}

function emitMessage(groupName: string, message: IMessage, senderId: string) {
  const users = groupsMap.get(groupName) || [];
  for (const user of users) {
    const tmpMessage = {
      ...message,
      sender: user.userId === senderId ? "me" : senderId,
    };
    const event = {
      event: "message",
      data: tmpMessage,
    };
    user.ws.send(JSON.stringify(event));
  }
}

function emitPreviousMessages(groupName: string, ws: WebSocket) {
  const messages = messagesMap.get(groupName) || [];

  const event = {
    event: "previousMessages",
    data: messages,
  };
  ws.send(JSON.stringify(event));
}

function leaveGroup(userId: string) {
  const user = usersMap.get(userId);
  if (!user) {
    return;
  }
  let users = groupsMap.get(user.groupName) || [];

  emitNotification(user, user.groupName, 0)

  users = users.filter((u) => u.userId !== userId);
  groupsMap.set(user.groupName, users);
  usersMap.delete(userId);
  emitUserList(user.groupName);
}
