const fs = require('fs');
const path = require('path');


function getSeisOnibus (message) {
    // Caminho para a pasta onde o vídeo está armazenado
    const videoPath = path.join(__dirname, '../resources/videos/seiseonibus.mp4');
    
    // Verifica se o arquivo existe
    if (!fs.existsSync(videoPath)) {
        return message.channel.send('O vídeo não foi encontrado.');
    }
    
    // Envia o vídeo
    message.channel.send({
        files: [{
            attachment: videoPath,
            name: 'seiseonibus.mp4'
        }]
    })
    .then(() => console.log('Vídeo enviado com sucesso!'))
    .catch(error => {
        console.error('Erro ao enviar o vídeo:', error);
        message.channel.send('Ocorreu um erro ao enviar o vídeo.');
    });
}

module.exports = { getSeisOnibus };
