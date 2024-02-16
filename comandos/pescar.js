const fs = require('fs');

// Função para sortear um número aleatório entre min e max (inclusive)
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Função para carregar os tempos de pesca a partir do arquivo JSON
function loadTimePesca() {
  try {
    const timePescaData = fs.readFileSync('timepesca.json', 'utf8');
    return JSON.parse(timePescaData);
  } catch (error) {
    // Se o arquivo não existir ou ocorrer um erro, retornar um objeto vazio
    return {};
  }
}

// Função para salvar os tempos de pesca no arquivo JSON
function saveTimePesca(timePesca) {
  fs.writeFileSync('timepesca.json', JSON.stringify(timePesca, null, 2));
}

// Função para verificar se já passou tempo suficiente desde a última pesca
function canFish(userId) {
  const timePesca = loadTimePesca(); // Corrigido aqui
  const now = Date.now();
  const lastFished = timePesca[userId] || 0;
  const umaHora = 60 * 60 * 1000;

  return now - lastFished >= umaHora;
}

// Função para pescar
async function getPeixes(message) {
  console.log('Entrou');
  
  try {
    const umaHora = 60 * 60 * 1000;

    const userId = message.author.id;
    if (!canFish(userId)) {
      const remainingTime = umaHora - (Date.now() - (loadTimePesca()[userId] || 0)); // Corrigido aqui
      const remainingHours = Math.ceil(remainingTime / (60 * 60 * 1000));
      message.reply(`Você precisa esperar ${remainingHours} horas antes de pescar novamente.`);
      return;
    }

    const timePesca = loadTimePesca(); // Corrigido aqui
    // Armazenar o tempo atual de pesca do usuário
    timePesca[userId] = Date.now();
    saveTimePesca(timePesca);

    // Carregar o arquivo JSON usando fs.readFile()
    const peixesData = fs.readFileSync('peixes.json', 'utf8');

    // Parse do JSON para objeto JavaScript
    const peixesJSON = JSON.parse(peixesData);

    // Sortear um peixe aleatoriamente
    const peixeSorteado = peixesJSON.peixes[getRandomInt(0, peixesJSON.peixes.length - 1)];

    // Gerar um peso aleatório em kg (entre 1 e 30)
    const pesoKg = getRandomInt(1, 30);

    // Construir a mensagem a ser enviada no Discord
    const resposta = `Você pescou um ${peixeSorteado.peixe} pesando ${pesoKg} kg.`;

    // Enviar a mensagem no canal onde o comando foi chamado
    message.channel.send(resposta);
  } catch (error) {
    console.error('Ocorreu um erro:', error);
    // Enviar mensagem de erro no canal onde o comando foi chamado
    message.channel.send("Ocorreu um erro ao processar o comando. Por favor, tente novamente mais tarde.");
  }
}

module.exports = { getPeixes };
