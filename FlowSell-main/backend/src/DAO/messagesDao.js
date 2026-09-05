import { Message } from "../models/Message.js";


class MessagesDAO{
    async getMessages(){

        const template = await Message.find();
  
        return template;
    };

    async postMessages(messages){

        const template = await Message.insertMany(messages, { ordered: false });

        return template;
    };

}

export const messagesDAO = new MessagesDAO()
