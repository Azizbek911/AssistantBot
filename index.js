// Kutubxonalar
const { Telegraf, session, Markup } = require("telegraf");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const axios = require("axios");

// Bu botni yasash yani ishga tushirish kommandasi
const bot = new Telegraf(process.env.BOT_TOKEN);

// Egalik IDlari
const ownerId = parseInt(process.env.OWNER_ID, 10);
const ownerID = process.env.OWNER_ID;


// Mantiqiy operator
let mission = 1;
let cash = { name: null, id: null }
// Alohida guruh uchun jo'natiladigan xabar
let group_message = { text: 0, ID: 0 , chat: 0}

// Malumotlarni saqlab olish uchun fayllar bu yerda yaratilgan
const usersFilePath = path.join(__dirname, "users.json");
const userIDs = loadData('users.json') || [];
const admins = loadData("admins.json") || [];
const groups = loadData("groups.json") || {};


const currentOperation = {};

// Malumotlarni JSON fayldan yuklash
function loadData(filename) {
    const filepath = path.join(__dirname, filename);
    if (fs.existsSync(filepath)) {
        return JSON.parse(fs.readFileSync(filepath, "utf8"));
    }
    return [];
}


bot.use(session());

// Faylarni JSON filega saqlash uchun ishlatiladi
function saveData(filename, data) {
    fs.writeFileSync(path.join(__dirname, filename), JSON.stringify(data, null, 2));
}


// Faylga yangi ma'lumot qo'shish uchun "update" funksiyasi
function update(filename, newData) {
    const filePath = path.join(__dirname, filename);

    let existingData = {};

    // Fayl mavjud bo'lsa, eski ma'lumotlarni o'qish
    if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        existingData = JSON.parse(fileContent);
    }

    // Yangi ma'lumotlarni mavjud ma'lumotlarga qo'shish
    Object.assign(existingData, newData);

    // Yangilangan ma'lumotlarni faylga yozish
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
}


// Admin yoki botning Egasi ekanligini tekshirib beradigan bot
const isAdminOrOwner = (userID) => {
    console.log('User ID: ', userID);
    console.log("Admins: ", admins);
    console.log("Owner ID: ", ownerId);

    const stringUserID = String(userID);

    return admins.includes(stringUserID) || stringUserID === String(ownerId);
}



// Start uchun xabar
bot.start(async (ctx) => {
    const userID = ctx.from.id;
    // foydalanuvchilarni saqlash uchun ishlatiladi
    if (!userIDs.includes(userID)) {
        userIDs.push(userID);
        saveData('users.json', userIDs);
    }
    // foydalanuvchi adminmi yoki yoq shuni tekshirish uchun yordam beradi
    if (isAdminOrOwner(userID)) {
        ctx.reply('Siz admin ekansiz, sizning ishingiz bu yerda: ', Markup.inlineKeyboard([
            [Markup.button.callback("Adminpanel", 'adminpanel')],
        ]))
    } else {
        // Admin bo'lmagan odamlar uchun xabar!
        const gifUrl = 'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExdHNmY2UzdXdoNjgxcTc1anVreDh5bjF1ZmVwZnczcjN0NmZ0cHlnZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Km2YiI2mzRKgw/giphy.gif';
        ctx.replyWithAnimation(gifUrl);
    }
})

// Admin panelga qaytish uchun ishlatiladi
bot.action("adminpanel", async (ctx) => {
    const userID = ctx.from.id;


    if (isAdminOrOwner(userID)) {
        const adminPanelButtons = [
            [{ text: "Adminlar 👮🏻‍♂️👮🏻‍♀️", callback_data: "view_admins" }, { text: "Guruhlar 👥", callback_data: "view_groups" }],
            [{ text: "Guruhni IDsini aniqlash 🔍", callback_data: "find_group_id" }],
            [{ text: "Guruh qo'shish ➕", callback_data: "add_group" }, { text: "Guruh o'chirish ➖", callback_data: "remove_group" }],
            [{ text: "Xabar tarqatish 🛫", callback_data: "message_sent" }, { text: "Guruh 🛫", callback_data: "group_message" }]
        ]

        if (userID === ownerId) {
            adminPanelButtons.unshift(
                [{ text: "Admin qo'shish ➕", callback_data: 'add_admin' }, { text: "Adminlikdan olish ➖", callback_data: "remove_admin" }]
            );
        }

        await ctx.editMessageText("Admin panel: ", {
            reply_markup: {
                inline_keyboard: adminPanelButtons
            }
        })
    } else {
        ctx.answerCbQuery("Sizda ruxsat mavjud emas😡")
    }
})

// Admin botni boshqarishi uchun xabarlar
bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const userID = ctx.from.id;
    if (!isAdminOrOwner(userID)) {
        ctx.answerCbQuery("Sizda ruxsat mavjud emas😡")
    }
    try {
        // Adminlarni ko'rish uchun ishlatiladigan callback_query
        if (data === "view_admins" && ctx.chat.type === 'private') {
            const adminList = admins.length ? admins.join('\n') : "Adminlar mavjud emas ⚠️";
            await ctx.editMessageText(`Adminlarning IDlari: ${adminList}`, Markup.inlineKeyboard([
                [Markup.button.callback("Orqaga 🔙", 'adminpanel')]
            ]))
        } else if (data === "add_admin" && userID === ownerId && ctx.chat.type === 'private') {
            currentOperation[userID] = { type: 'add_admin', messageId: null };
            const sentMessage = await ctx.editMessageText('Please send the user ID to add as an admin:', { reply_markup: { inline_keyboard: [[{ text: 'Cancel', callback_data: 'cancel' }]] } });
            currentOperation[userID].messageId = sentMessage.message_id;
        } else if (data === 'cancel') {
            if (currentOperation[userID] && currentOperation[userID].messageId) {
                // try {
                //   await ctx.deleteMessage(currentOperation[userID].messageId);
                // } catch (err) {
                //   console.error('Failed to delete message:', err);
                // }
                delete currentOperation[userID];
                await ctx.editMessageText('AdminPanel: ', Markup.inlineKeyboard([
                    [Markup.button.callback("Adminpanel", 'adminpanel')],
                ]))
            }
        } else if (data === "remove_admin" && userID === ownerId && ctx.chat.type === 'private') {
            currentOperation[userID] = { type: "remove_admin", messageId: null }
            const sentMessage = await ctx.editMessageText("Iltimos, o'chirmoqchi bo'lgan admingizni IDsini kiriting: ", {
                reply_markup: {
                    inline_keyboard: [[{ text: "Bekor qilish", callback_data: "cancel" }]]
                }
            });
            currentOperation[userID].messageId = sentMessage.message_id
        } else if (data === "find_group_id") {
            currentOperation[userID] = { type: "find_group_id", messageId: null }
            const sentMessage = await ctx.editMessageText("Shaxsiy guruhdan menga xabar jo'nating: ", { reply_markup: { inline_keyboard: [[{ text: "Bekor qilish", callback_data: "cancel" }]] } });
            currentOperation[userID].messageId = sentMessage.message_id
        } else if (data === "view_groups" && ctx.chat.type === 'private') {
            // Faylni o'qish
            const filePath = path.join(__dirname, 'groups.json');

            try {
                const fileContent = fs.readFileSync(filePath, 'utf8');
                const data = JSON.parse(fileContent);

                // Check if 'information' exists and is an array
                if (data && Array.isArray(data.information)) {
                    const groups = data.information;

                    // Now use the groups array
                    const adminInfoString = groups.map(group => `Name: ${group.name}, ID: ${group.id}`).join('\n');
                    const adminList = adminInfoString.length ? adminInfoString : 'Guruhlar mavjud emas !';
                    await ctx.editMessageText(adminList, Markup.inlineKeyboard([
                        [Markup.button.callback("Orqaga 🔙", 'adminpanel')]
                    ]));
                } else {
                    console.error("No valid 'information' array found in the data.");
                    await ctx.editMessageText("Xatolik: Guruhlar ma'lumotlari topilmadi.", Markup.inlineKeyboard([
                        [Markup.button.callback("Orqaga 🔙", 'adminpanel')]
                    ]));
                }
            } catch (error) {
                console.error("Error reading or parsing JSON file:", error);
            }
        } else if (data === "add_group" && ctx.chat.type === 'private') {
            currentOperation[userID] = { type: "add_group", messageId: null }
            const sentMessage = await ctx.editMessageText("Guruhni qo'shish uchun uning ID'sini yuboring: ", { reply_markup: { inline_keyboard: [[{ text: "Bekor qilish", callback_data: "cancel" }]] } });
            currentOperation[userID].messageId = sentMessage.message_id
        } else if (data === "remove_group" && ctx.chat.type === 'private') {
            currentOperation[userID] = { type: "remove_group", messageId: null }
            const sentMessage = await ctx.editMessageText("Guruhni o'chirish uchun IDsini yuboring: ", { reply_markup: { inline_keyboard: [[{ text: "Bekor qilish", callback_data: "cancel" }]] } });
            currentOperation[userID].messageId = sentMessage.message_id;
        } else if (data === "message_sent" && ctx.chat.type === 'private') {

            if (!groups) {
                return ctx.reply("Guruhlar mavjud emas 🚫")
            }
            currentOperation[userID] = { type: "message_sent", messageId: null }
            const sentMessage = await ctx.editMessageText("Jo'natilishi kerak bo'lgan xabarni kiriting: ", { reply_markup: { inline_keyboard: [[{ text: "Bekor qilish", callback_data: "cancel" }]] } })
            currentOperation[userID].messageId = sentMessage.message_id;
        } else if (data === "group_message" && ctx.chat.type === 'private') {
            currentOperation[userID] = { type: "group_message", messageId: null }
            const sentMessage = await ctx.editMessageText("Guruhni IDsini kiriting: ", { reply_markup: { inline_keyboard: [[{ text: "Bekor qilish", callback_data: "cancel" }]] } });
            currentOperation[userID].messageId = sentMessage.message_id;
        }
    } catch (error) {
        console.log("Bizda xatolik mavjud: ", error);
        await ctx.answerCbQuery("Botda xatolikga duch keldi, dasturchi bilan bog'laning!")
    }
});

// bu yordamchi kommandalarni yordam beradigan funksiya
bot.on('message', async (ctx) => {
    const userID = ctx.from.id;
    if (!isAdminOrOwner) {
        return;
    }
    if (currentOperation[userID]) {
        const operation = currentOperation[userID];

        try {
            if (operation.type === "add_admin") {
                if (!admins.includes(ctx.message.text)) {
                    admins.push(ctx.message.text);
                    saveData('admins.json', admins);
                    await ctx.reply("Admin muvofiqiyatli qo'shildi ✅")
                } else {
                    ctx.reply("Bu foydalanuvchi allaqachon admin 🚫")
                }
            } else if (operation.type === "remove_admin") {
                const index = admins.indexOf(ctx.message.text);
                if (index > -1) {
                    admins.splice(index, 1);
                    saveData('admins.json', admins);
                    await ctx.reply("Admin muvofiqyatli o'chirildi ⚠️")
                } else {
                    ctx.reply("Bu foydalanuvchi admin emas ⛔️")
                }
            } else if (operation.type === "find_group_id") {
                const groupId = ctx.chat.id; // This will capture the group ID
                console.log(`Group ID: ${groupId}`);
                ctx.reply(`This group's ID is: ${groupId}`);
            } else if (operation.type === "add_group") {
                if (mission === 1) {
                    console.log("first");

                    cash.id = ctx.message.text;
                    mission = 0;
                    ctx.reply("Endi guruhning nomini kiriting: ", {
                        reply_markup: {
                            inline_keyboard: [[{ text: "Bekor qilish", callback_data: "cancel" }]]
                        }
                    });
                } else if (mission === 0) {
                    console.log("second");

                    cash.name = ctx.message.text;
                    console.log(cash);

                    groups.information.push(cash)
                    update("groups.json", groups);
                    mission = 1;
                    ctx.reply("Guruh muvofaqiyatli saqlandi ✅")
                }
            } else if (operation.type === "remove_group") {
                const idToDelete = ctx.message.text.trim(); // The message is assumed to contain the ID to delete

                if (!idToDelete) {
                    return ctx.reply("Iltimos yaroqli IDni kiriting o'chirish uchun ⚠️");
                }

                // Load the JSON data from 'groups.json'


                // Check if the ID exists in the 'information' array
                const entryExists = groups.information.some(item => item.id === idToDelete);

                if (!entryExists) {
                    return ctx.reply(`Bu ID bilan guruh aniqlanmadi: ${idToDelete}`);
                }

                // Filter out the entry with the matching ID
                groups.information = groups.information.filter(item => item.id !== idToDelete);

                // Save the updated data back to 'groups.json'
                update("groups.json", groups);

                // Respond to the user
                ctx.reply(`Entry with ID ${idToDelete} has been deleted.`);
            } else if (operation.type === "message_sent") {
                let chat_id = ctx.message.chat.id;
                let message_id = ctx.message.message_id;
                // Faylni o'qish
                const filePath = path.join(__dirname, 'groups.json');

                try {
                    const fileContent = fs.readFileSync(filePath, 'utf8');
                    const data = JSON.parse(fileContent);

                    // Check if 'information' exists and is an array
                    if (data && Array.isArray(data.information)) {
                        const groups = data.information;

                        // Now use the groups array
                        const adminInfoString = groups.map(group => group.id);
                        console.log(adminInfoString);

                        for (const id of adminInfoString) {
                            let ID = parseInt(id)
                            try {
                                await ctx.telegram.forwardMessage(ID, chat_id, message_id)
                            } catch (error) {
                                console.log("Bizda xatolik mavjud: ", error);
                            }
                        }



                        await ctx.reply("Xabar guruhlarga tarqatildi ✅");
                    } else {
                        console.error("No valid 'information' array found in the data.");
                        await ctx.editMessageText("Xatolik: Guruhlar ma'lumotlari topilmadi.", Markup.inlineKeyboard([
                            [Markup.button.callback("Orqaga 🔙", 'adminpanel')]
                        ]));
                    }
                } catch (error) {
                    console.error("Error reading or parsing JSON file:", error);
                }
            } else if (operation.type === "group_message") {
                if (group_message.ID === 0) {
                    group_message.ID = ctx.message.text;
                    await ctx.reply(`Guruhning IDsi qabul qilindi, endi xabarni kiriting\nID: ${group_message.ID}`)
                } else if (group_message.text === 0 && group_message.ID != 0) {
                    group_message.chat = ctx.message.chat.id; 
                    group_message.text = ctx.message.message_id;
                    await ctx.reply(`Malumotlar saqlandi:\nGuruh IDsi: ${group_message.ID}\nGuruh uchun xabar: `)
                    await ctx.forwardMessage(ctx.from.id, group_message.chat, group_message.text)
                    await ctx.reply("Xabar jo'natilsinmi: (ha yoki yoq)")
                } else {
                    if (ctx.message.text === "ha") {
                        bot.telegram.forwardMessage(group_message.ID, group_message.chat, group_message.text)
                            .then(() => {
                                console.log('Message sent to the private group.');
                            })
                            .catch((err) => {
                                console.error('Error sending message to group:', err);
                            });
                        group_message.ID = 0;
                        group_message.text = 0;
                        await ctx.reply("Topshiriq bajarildi ✅", { reply_markup: { inline_keyboard: [[{ text: "Bekor qilish", callback_data: "cancel" }]] } })
                    } else if (ctx.message.text === "yoq") {
                        group_message.ID = 0;
                        group_message.text = 0;
                        ctx.reply("Guruh IDsini qayta yuboring: ")
                    } else {
                        ctx.reply("Nomalum buyruq ❌")
                    }
                }
            }
        } catch (error) {
            console.log("Bizda xatolik mavjud: ", error);
            // await ctx.answerCbQuery("Botda xatolikga duch keldi, dasturchi bilan bog'laning!")
        }
    }
})



bot.launch().then(() => console.log("Bot xatolarsiz ishlayabdi!")).catch((err) => console.log("Botni ishlatyoganimizda shu yerda xatlik bo'ldi: ", err))