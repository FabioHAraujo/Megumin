const { Client, GatewayIntentBits } = require('discord.js');
const { OpenAI } = require("openai");
const { executeRussianRoulette, getRanking } = require('./comandos/roletarussa.js');
const { getComandos } = require('./comandos/comandos.js');
const { getChifres } = require('./comandos/chifres.js')
const { getClimaByLocation } = require("./comandos/clima.js");
const fs = require('fs');
const { getBakuretsu } = require('./comandos/bakuretsu.js');
const { aniversario } = require('./comandos/aniversario');
const { getZonibu } = require('./comandos/zonibu.js');
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

function verificarAniversarios() {
    const horaAtual = new Date().getHours();
    // Verifica se é meio dia && minutoAtual === 11
    if (horaAtual === 7 || horaAtual === 12 || horaAtual === 19) {
        console.log('Foi igual');
        const aniversarios = JSON.parse(fs.readFileSync('./aniversarios.json', 'utf-8'));
        console.log('Aniversários lidos:', aniversarios);
        const hoje = new Date();
        const diaAtual = hoje.getDate();
        console.log('diaAtual: ', diaAtual);
        const mesAtual = hoje.getMonth() + 1;
        console.log('mesAtual: ', mesAtual);

        const aniversariantesDoDia = [];

        Object.entries(aniversarios).forEach(([nome, dataString]) => {
            const data = new Date(dataString); // Convertendo a string para objeto Date
            console.log('Entrou no loop');
            if (!isNaN(data.getTime())) {
                console.log('Sobreviveu ao if');
                const diaAniversario = data.getDate()+1;
                console.log(diaAniversario);
                const mesAniversario = data.getMonth() + 1; // Adicionando 1 porque os meses começam de 0
                console.log(mesAniversario);
                if (diaAniversario === diaAtual && mesAniversario === mesAtual) {
                    aniversariantesDoDia.push([nome, diaAniversario, mesAniversario]);
                }
            }
        });

        // Envia mensagem de feliz aniversário para cada aniversariante
        console.log('Aniversariantes do dia:', aniversariantesDoDia);
        aniversariantesDoDia.forEach(([nome]) => {
            const canalGeral = client.channels.cache.get('935879667544653856');
            console.log('Antes de enviar mensagem');
            canalGeral.send(`🎉🎈 Feliz aniversário, ${nome}! 🎈🎉`);
        });
        console.log('Final');
    }
};


// Quando discord bot é iniciado
client.once('ready', () => {
    console.log('Bot is ready!');

    // Verifica aniversários diariamente ao meio dia
    setInterval(verificarAniversarios, 3600000); // Verifica a cada minuto
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

// LE MENSAGEM - COMANDOS SPAMMERS
client.on('messageCreate', async message => {

    if (message.author.bot || !message.content || message.content === '') return; //Ignore bot messages

    if (message.channel.name === 'gpt' || message.channel.name === 'geral' ) return; // ignora o que for gpt e geral

    if(!message.content.startsWith === '!') return;
    
    // Comando para executar a roleta-russa
    if (message.content === '!roletarussa') {
        executeRussianRoulette(message);
    }
    // Comando para exibir o ranking
    else if (message.content === '!roletaranking') {
        const ranking = getRanking(message);
        message.channel.send(ranking);
    }

    else if (message.content === '!comandos' || message.content === '!cmd') {
        const mensagem = getComandos(message);
        message.channel.send(mensagem);
    }

    // Dentro do seu bloco de código onde trata os comandos
    else if (message.content.startsWith('!clima')) {
        const args = message.content.slice('!clima'.length).trim().split(/ +/);
        const cidade = args.join(' '); // Concatena todas as partes da cidade separadas por espaço
        if (!cidade) {
            message.channel.send("Por favor, forneça o nome de uma cidade.");
            return;
        }
        const retorno = await getClimaByLocation(cidade, message);
        retorno.forEach(({ msg, react, reply }) => {
            if (reply) message.reply(msg);
            else message.channel.send(msg);
            if (react) message.react(react);
        });
    }
    
});


// LE MENSAGEM - COMANDOS SOCIAIS
client.on('messageCreate', async message => {

    if (message.author.bot || !message.content || message.content === '') return; //Ignore bot messages

    if (message.channel.name === 'gpt') return; // ignora o que for gpt e geral

    if(!message.content.startsWith === '!') return;

    else if (message.content === '!bakuretsu') {
        const mensagem = getBakuretsu(message);
        message.channel.send(mensagem);
    }

    else if (message.content.startsWith('!aniversario')) {
        aniversario(message);
    }

    else if (message.content === '!zonibu') {
        getZonibu(message);
    }

    else if (message.content === '!chifres') {
        const mensagem = getChifres(message);
        message.channel.send(mensagem);
    }
});


// RESPSOTAS ALEATÓRIAS
client.on('messageCreate', async message => {
    const chance = Math.floor(Math.random() * 20) + 1; // Número aleatório entre 1 e 20
    if (chance === 1) {

    } else {

    }
});


// Authenticate Discord
client.login(process.env.DISCORD_TOKEN);