/**
 * LOGICA DO BOTÃO DE DOWNLOAD (FRONTEND DA VERCEL)
 * 
 * Esse arquivo contém a lógica JavaScript que você deve adicionar ao 
 * código Frontend do `Tudo Certo` original hospedado na Vercel (onde 
 * fica sua Landing Page ou botão de download do app).
 * 
 * Ele detecta automaticamente qual o sistema do usuário e muda
 * a ação do botão principal para baixar a versão correta do GitHub Releases.
 */

// 1. Função que detecta o Sistema Operacional do usuário
function detectOS() {
    const userAgent = window.navigator.userAgent;
    const platform = window.navigator.platform;
    const macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'];
    const windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'];
    const iosPlatforms = ['iPhone', 'iPad', 'iPod'];

    if (macosPlatforms.indexOf(platform) !== -1) {
        return 'MacOS';
    } else if (iosPlatforms.indexOf(platform) !== -1) {
        return 'iOS';
    } else if (windowsPlatforms.indexOf(platform) !== -1) {
        return 'Windows';
    } else if (/Android/.test(userAgent)) {
        return 'Android';
    } else if (!platform && /Linux/.test(platform)) {
        return 'Linux';
    }

    return 'Unknown';
}

// 2. Configura a URL de Download final. 
function getDownloadLink(os) {
    const baseUrl = 'https://github.com/tudocertoapp/windows/releases/latest/download';

    switch (os) {
        case 'Windows':
            return {
                url: `${baseUrl}/MeuApp-Setup.exe`,
                label: 'Baixar para Windows (.exe)'
            };
        case 'MacOS':
            return {
                url: `${baseUrl}/MeuApp.dmg`,
                label: 'Baixar para macOS (.dmg)'
            };
        case 'Linux':
            return {
                // Você pode mudar para .deb se preferir o foco em Debian/Ubuntu
                url: `${baseUrl}/MeuApp.AppImage`,
                label: 'Baixar para Linux (.AppImage)'
            };
        default:
            return {
                url: 'https://github.com/tudocertoapp/windows/releases/latest',
                label: 'Ver todos os downloads'
            };
    }
}

// 3. Script para vincular a lógica ao HTML (se usar HTML Puro ou Vanilla)
// Se usar React/Next.js (comum na Vercel), adapte esta lógica para dentro de um useEffect!
document.addEventListener('DOMContentLoaded', () => {
    // Pega o OS e adquire o link correto
    const os = detectOS();
    const downloadInfo = getDownloadLink(os);

    // Adiciona ao botão. Considere ter um "<a id="download-btn-app"></a>"
    const btn = document.getElementById('download-btn-app');
    if (btn) {
        btn.href = downloadInfo.url;
        btn.textContent = downloadInfo.label;

        // Se quiser adicionar um tooltip ou outra ação
        btn.setAttribute('aria-label', `Baixando versão compatível com ${os}`);
    }
});

/*
// EXEMPLO EM REACT / NEXT.JS:
export default function DownloadButton() {
  const [downloadLink, setDownloadLink] = useState('#');
  const [btnText, setBtnText] = useState('Carregando botão...');

  useEffect(() => {
    const os = detectOS(); // Sua função aqui!
    const info = getDownloadLink(os);
    setDownloadLink(info.url);
    setBtnText(info.label);
  }, []);

  return (
    <a href={downloadLink} className="btn-primary">
      {btnText}
    </a>
  );
}
*/
