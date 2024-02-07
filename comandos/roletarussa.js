const fs = require('fs');

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

// Função para obter o ranking
const getRanking = (message) => {
    let leaderboard = Object.entries(roletaRanking).sort((a, b) => b[1].record - a[1].record);
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
    return reply;
}

module.exports = { addPointsToUser, addDeathToUser, executeRussianRoulette, getRanking };
