const fs = require("fs");

const getComandos = (message) => {
  try {
    const commands = fs.readFileSync('comandos.txt', 'utf8');
    return commands;
  } catch (error) {
    console.error('Erro ao ler arquivo de comandos:', error);
    message.reply('Ocorreu um erro ao carregar os comandos.');
  }
}

module.exports = { getComandos };