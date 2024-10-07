const { Telegraf } = require('telegraf');
require("dotenv").config();
const bot = new Telegraf(process.env.BOT_TOKEN);

// Replace with the chat ID of your private group
const groupChatId = '-4515817322';  // Example group chat ID (it usually starts with a '-')

bot.command('sendtogroup', (ctx) => {
  bot.telegram.sendMessage(groupChatId, 'Hello, group! This message is from the bot.')
    .then(() => {
      ctx.reply('Message sent to the private group.');
    })
    .catch((err) => {
      console.error('Error sending message to group:', err);
      ctx.reply('Failed to send the message.');
    });
});

bot.launch();
