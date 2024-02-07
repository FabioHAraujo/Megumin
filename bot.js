const { Client, GatewayIntentBits } = require('discord.js');
const { OpenAI } = require("openai");
const fs = require('fs');
require("dotenv").config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Discord Client
const client = new Client({
  intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// When discord bot has started up
client.once('ready', () => {
    console.log('Bot is ready!');
});



const threadMap = {};

const getOpenAiThreadId = (discordThreadId) => {
    // Replace this in-memory implementation with a database (e.g. DynamoDB, Firestore, Redis)
    return threadMap[discordThreadId];
}

const addThreadToMap = (discordThreadId, openAiThreadId) => {
    threadMap[discordThreadId] = openAiThreadId;
}

const terminalStates = ["cancelled", "failed", "completed", "expired"];
const statusCheckLoop = async (openAiThreadId, runId) => {
    const run = await openai.beta.threads.runs.retrieve(
        openAiThreadId,
        runId
    );

    if(terminalStates.indexOf(run.status) < 0){
        await sleep(1000);
        return statusCheckLoop(openAiThreadId, runId);
    }
    // console.log(run);

    return run.status;
}

const addMessage = (threadId, content) => {
    // console.log(content);
    return openai.beta.threads.messages.create(
        threadId,
        { role: "user", content }
    )
}

// This event will run every time a message is received
client.on('messageCreate', async message => {
    if (message.author.bot || !message.content || message.content === '') return; //Ignore bot messages
    
    // console.log(message);
    if (message.channel.name !== 'gpt') return; // ignora o que não for do gpt

    const discordThreadId = message.channel.id;
    let openAiThreadId = getOpenAiThreadId(discordThreadId);

    let messagesLoaded = false;
    if(!openAiThreadId){
        const thread = await openai.beta.threads.create();
        openAiThreadId = thread.id;
        addThreadToMap(discordThreadId, openAiThreadId);
        if(message.channel.isThread()){
            //Gather all thread messages to fill out the OpenAI thread since we haven't seen this one yet
            const starterMsg = await message.channel.fetchStarterMessage();
            const otherMessagesRaw = await message.channel.messages.fetch();

            const otherMessages = Array.from(otherMessagesRaw.values())
                .map(msg => msg.content)
                .reverse(); //oldest first

            const messages = [starterMsg.content, ...otherMessages]
                .filter(msg => !!msg && msg !== '')

            // console.log(messages);
            await Promise.all(messages.map(msg => addMessage(openAiThreadId, msg)));
            messagesLoaded = true;
        }
    }

    // console.log(openAiThreadId);
    if(!messagesLoaded){ //If this is for a thread, assume msg was loaded via .fetch() earlier
        await addMessage(openAiThreadId, message.content);
    }

    const run = await openai.beta.threads.runs.create(
        openAiThreadId,
        { assistant_id: process.env.ASSISTANT_ID }
    )
    const status = await statusCheckLoop(openAiThreadId, run.id);

    const messages = await openai.beta.threads.messages.list(openAiThreadId);
    let response = messages.data[0].content[0].text.value;
    response = response.substring(0, 1999) //Discord msg length limit when I was testing

    console.log(response);
    
    message.reply(response);
});

// ROLETA RUSSA

// Inicialização do ranking
let roletaRanking = {};

// Carrega o ranking salvo, se existir
if (fs.existsSync('roleta-ranking.json')) {
    roletaRanking = JSON.parse(fs.readFileSync('roleta-ranking.json', 'utf8'));
} else {
    // Cria o arquivo se não existir
    fs.writeFileSync('roleta-ranking.json', JSON.stringify(roletaRanking));
}

// Função para atualizar o arquivo do ranking
const updateRankingFile = () => {
    fs.writeFileSync('roleta-ranking.json', JSON.stringify(roletaRanking));
}

// Função para adicionar pontos a um usuário
const addPointsToUser = (userId, points) => {
    if (!roletaRanking[userId]) {
        roletaRanking[userId] = { record: 0, atual: points, deaths: 0 };
    } else {
        roletaRanking[userId].atual += points;
        if (roletaRanking[userId].atual > roletaRanking[userId].record) {
            roletaRanking[userId].record = roletaRanking[userId].atual;
        }
    }
    updateRankingFile();
}

// Função para adicionar uma morte a um usuário
const addDeathToUser = (userId) => {
    if (!roletaRanking[userId]) {
        roletaRanking[userId] = { record: 0, atual: 0, deaths: 1 };
    } else {
        roletaRanking[userId].deaths++;
    }
    roletaRanking[userId].atual = 0; // Reset pontos quando morto
    updateRankingFile();
}

// Função para executar a roleta-russa
const executeRussianRoulette = (message) => {
    const chance = Math.floor(Math.random() * 6) + 1; // Número aleatório entre 1 e 6
    if (chance === 1) {
        addDeathToUser(message.author.id);
        message.reply("Você morreu! :gun:");
    } else {
        const userId = message.author.id;
        addPointsToUser(userId, 1);
        const userRecord = roletaRanking[userId].record;
        const userPoints = roletaRanking[userId].atual;

        message.reply(`Você sobreviveu! :tada: (Pontos: ${userPoints} vezes, Recorde: ${userRecord}, Mortes: ${roletaRanking[userId].deaths})`);
    }
}   



// LE MENSAGEM - ROLETA RUSSA
client.on('messageCreate', async message => {
    if (message.author.bot || !message.content || message.content === '') return; // Ignore bot messages

    // console.log(message);
    if (message.channel.name === 'geral') return; // ignora o que for no geral

    // Comando para executar a roleta-russa
    if (message.content === '!roletarussa') {
        executeRussianRoulette(message);
    }
    // Comando para exibir o ranking
    else if (message.content === '!roletaranking') {
        let leaderboard = Object.entries(roletaRanking).sort((a, b) => b[1].record - a[1].record);
        if (leaderboard.length === 0) {
            message.reply("O ranking está vazio!");
        } else {
            let reply = "**Ranking de Roleta-Russa:**\n";
            leaderboard.forEach((entry, index) => {
                const userId = entry[0];
                const userPoints = entry[1].atual;
                const userRecord = entry[1].record;
                const userDeaths = entry[1].deaths;
            
                // Obtém o membro do servidor (guild) pelo ID do usuário
                const member = message.guild.members.cache.get(userId);
            
                // Verifica se o membro existe e obtém seu nome
                const username = member ? member.displayName : "Usuário não encontrado";
            
                reply += `${index + 1}. ${username} - Pontos: ${userPoints}, Recorde: ${userRecord}, Mortes: ${userDeaths}\n`;
            });
            message.channel.send(reply);
        }
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.content || message.content === '') return; //Ignore bot messages
    
    // console.log(message);
    if (message.channel.name === 'geral') return; // ignora o que for no geral

    if (message.content === '!comandos' || message.content === '!cmd'){
        try {
            const commands = fs.readFileSync('comandos.txt', 'utf8');
            message.channel.send(commands);
        } catch (error) {
            console.error('Erro ao ler arquivo de comandos:', error);
            message.reply('Ocorreu um erro ao carregar os comandos.');
        }
    }
});

// Authenticate Discord
client.login(process.env.DISCORD_TOKEN);