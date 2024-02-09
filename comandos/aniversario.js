const fs = require('fs');

const ensureFileExists = (filePath) => {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '{}');
    }
};

const aniversario = (message) => {
    const args = message.content.slice('!aniversario'.length).trim().split(/ +/);
    const nome = args.slice(0, -1).join(' '); // Pegar todos os argumentos exceto o último como o nome

    // Pegar a última parte dos argumentos como a data de nascimento
    const dataNascimento = args[args.length - 1];

    const [dia, mes, ano] = dataNascimento.split('/');
    const data = new Date(`${mes}/${dia}/${ano}`);

    if (isNaN(data.getTime())) {
        message.channel.send("Formato de data inválido. Use DD/MM/AAAA.");
        return;
    }

    const filePath = './aniversarios.json';
    ensureFileExists(filePath);

    const aniversarios = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Usamos o nome composto como chave no objeto
    aniversarios[nome] = data;

    fs.writeFileSync(filePath, JSON.stringify(aniversarios, null, 4));

    message.channel.send(`Aniversário de ${nome} registrado para ${dataNascimento}.`);
};

module.exports = { aniversario };
