const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
require("dotenv").config();
// Initialize Telegraf with your bot token
const bot = new Telegraf(process.env.BOT_TOKEN);

// Function to load the groups.json file dynamically
function loadGroups() {
  return JSON.parse(fs.readFileSync('groups.json', 'utf-8'));
}

// Handle the '/groups' command to send group buttons
bot.command('groups', (ctx) => {
  const groupsData = loadGroups(); // Reload the JSON file each time
  const buttons = groupsData.information.map(group => {
    return [Markup.button.callback(group.name, group.id)];
  });

  // Send the inline buttons as a message
  return ctx.reply('Choose a group:', Markup.inlineKeyboard(buttons));
});

// Handle the button press action
bot.on('callback_query', (ctx) => {
  const groupsData = loadGroups(); // Reload the JSON file
  const group = groupsData.information.find(group => group.id === ctx.callbackQuery.data);
  if (group) {
    ctx.reply(`You selected the group: ${group.name}`);
  } else {
    ctx.reply('Group not found');
  }
});

// Start the bot
bot.launch();
