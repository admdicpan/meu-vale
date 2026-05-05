// ==================== CONFIGURAÇÃO ====================
// ⚠️ Substitua pela URL real do seu Apps Script
const API_URL = 'https://script.google.com/macros/s/AKfycbwxINi6W8Lvbk063K2A653Gy_4dqqYugZg4mu501KdsLAM0Mh0xaBnJiJcZTV9mhLuZcQ/exec';

// Variáveis globais
let codigoAtual = null;       
let graficoInstancia = null;  
let valoresOcultos = localStorage.getItem('privacidadeApp') === 'true'; 

// ==================== INICIALIZAÇÃO ====================
document.getElementById('codigoInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') buscarVales();
});

window.addEventListener('DOMContentLoaded', () => {
    configurarSaudacao();
    
    if (valoresOcultos) {
        const icone = document.getElementById('iconePrivacidade');
        if (icone) icone.className = 'ph ph-eye-slash text-2xl';
    }

    const codigoSalvo = localStorage.getItem('ultimoCodigoVale');
    if (codigoSalvo) {
        document.getElementById('codigoInput').value = codigoSalvo;
    }
});

// ==================== UTILITÁRIOS ====================

const vibrar = (ms = 50) => {
    if (navigator.vibrate) navigator.vibrate(ms);
};

const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
};

function mostrarErro(mensagem) {
    const container = document.getElementById('resultadoContainer');
    container.innerHTML = `
        <div class="bg-red-50 text-red-600 p-6 rounded-2xl flex items-start gap-4 fade-in border border-red-100">
            <i class="ph ph-warning-circle text-2xl shrink-0 mt-0.5"></i>
            <div>
                <h3 class="font-semibold text-lg mb-1">Não foi possível consultar</h3>
                <p class="text-red-500/80">${mensagem}</p>
            </div>
        </div>
    `;
}

function configurarSaudacao() {
    const hora = new Date().getHours();
    let saudacao = 'Boa noite';
    if (hora >= 5 && hora < 12) saudacao = 'Bom dia';
    else if (hora >= 12 && hora < 18) saudacao = 'Boa tarde';
    
    const elemento = document.getElementById('textoSaudacao');
    if (elemento) elemento.innerHTML = `${saudacao}! Consulte seu extrato do mês.`;
}

function alternarPrivacidade() {
    valoresOcultos = !valoresOcultos;
    localStorage.setItem('privacidadeApp', valoresOcultos);
    
    const icone = document.getElementById('iconePrivacidade');
    if (icone) {
        icone.className = valoresOcultos ? 'ph ph-eye-slash text-2xl' : 'ph ph-eye text-2xl';
    }

    const elementosSensiveis = document.querySelectorAll('.valor-sensivel');
    elementosSensiveis.forEach(el => {
        if (valoresOcultos) {
            el.classList.add('blur-md', 'select-none', 'opacity-60');
        } else {
            el.classList.remove('blur-md', 'select-none', 'opacity-60');
        }
    });

    if (graficoInstancia) {
        const corBarra = valoresOcultos ? 'rgba(203, 213, 225, 0.4)' : '#3b82f6';
        graficoInstancia.data.datasets[0].backgroundColor = corBarra;
        graficoInstancia.data.datasets[0].borderColor = corBarra;
        graficoInstancia.update();
    }
}

/**
 * Desconecta o usuário atual limpando os dados da tela e do cache.
 */
function desconectar() {
    vibrar();
    
    // Limpa o código salvo
    localStorage.removeItem('ultimoCodigoVale');
    codigoAtual = null;
    
    // Reseta a interface
    const input = document.getElementById('codigoInput');
    input.value = '';
    
    const container = document.getElementById('resultadoContainer');
    container.innerHTML = `
        <div class="fade-in py-8 flex flex-col items-center justify-center text-center">
            <i class="ph ph-identification-badge text-slate-300 text-6xl mb-4"></i>
            <h3 class="text-slate-600 font-semibold text-lg mb-1">Pronto para consultar</h3>
            <p class="text-slate-400 font-medium max-w-sm mx-auto">Informe seu código de colaborador acima para visualizar o detalhamento dos seus vales.</p>
        </div>
    `;
    
    // Destrói o gráfico anterior
    if (graficoInstancia) {
        graficoInstancia.destroy();
        graficoInstancia = null;
    }
    
    input.focus();
}

// ==================== FLUXO PRINCIPAL ====================

async function buscarVales() {
    const input = document.getElementById('codigoInput');
    const btn = document.getElementById('btnConsultar');
    const btnText = document.getElementById('btnText');
    const btnIcon = document.getElementById('btnIcon');
    const container = document.getElementById('resultadoContainer');
    
    const codigo = input.value.trim().toUpperCase();
    if (!codigo) {
        vibrar([50, 50, 50]);
        mostrarErro("Por favor, digite um código válido.");
        input.focus();
        return;
    }

    vibrar();

    if (!navigator.onLine) {
        console.log("Modo offline detectado. Tentando recuperar do cache...");
    }

    btn.disabled = true;
    input.disabled = true;
    input.blur(); 
    btnText.textContent = 'Buscando...';
    btnIcon.className = 'ph ph-spinner-gap text-xl animate-spin';
    
    // Mostra indicador de carregamento
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12 fade-in">
            <i class="ph ph-circle-notch text-primary-500 text-5xl animate-spin mb-4"></i>
            <p class="text-slate-500 font-medium">Buscando dados no sistema...</p>
        </div>
    `;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(`${API_URL}?codigo=${encodeURIComponent(codigo)}`, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`Erro na conexão (${response.status})`);
        
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        codigoAtual = data.codigo;
        localStorage.setItem('ultimoCodigoVale', codigoAtual);
        vibrar(30); 
        renderizarResultado(data, codigo);
        
    } catch (erro) {
        clearTimeout(timeoutId);
        vibrar([50, 100, 50]); 
        
        if (erro.name === 'AbortError') {
            mostrarErro("O servidor demorou muito para responder. Tente novamente.");
        } else {
            mostrarErro(navigator.onLine ? erro.message : "Você está offline e não temos dados salvos para este código.");
        }
    } finally {
        btn.disabled = false;
        input.disabled = false;
        btnText.textContent = 'Consultar';
        btnIcon.className = 'ph ph-magnifying-glass text-xl';
        
        if (window.innerWidth > 768 && !graficoInstancia) input.focus();
    }
}

function renderizarResultado(data, codigoConsultado) {
    const container = document.getElementById('resultadoContainer');
    
    if (!data.agrupadoPorDia || data.agrupadoPorDia.length === 0) {
        container.innerHTML = `
            <div class="bg-amber-50 border border-amber-100 p-6 rounded-2xl flex items-start gap-4 fade-in">
                <i class="ph ph-info text-2xl text-amber-500 shrink-0 mt-0.5"></i>
                <div>
                    <h3 class="font-semibold text-amber-800 text-lg mb-1">Nenhum vale encontrado</h3>
                    <p class="text-amber-700/80">Não localizamos consumo do tipo "VALE FUNCIONÁRIO" para o código <b>${codigoConsultado}</b> neste período.</p>
                </div>
            </div>
        `;
        return;
    }

    const nomeCliente = data.cliente || 'Colaborador';
    const totalMes = data.totalMes || 0;

    const labelsGrafico = [];
    const valoresGrafico = [];

    const linhasTabela = data.agrupadoPorDia.map(item => {
        const dataObj = new Date(item.data + 'T12:00:00'); 
        const dataCurta = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.','');
        const dataFormatada = dataObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        
        labelsGrafico.push(dataCurta);
        valoresGrafico.push(item.totalDia);

        return `
            <tr class="hover:bg-blue-50/60 transition-colors cursor-pointer group" 
                onclick="abrirDetalhes('${item.data}')" title="Clique para ver itens do dia">
                <td class="py-3 px-4 border-b border-slate-100 text-slate-600 group-hover:text-slate-900 font-medium">${dataFormatada}</td>
                <td class="py-3 px-4 border-b border-slate-100 text-right font-medium text-slate-700">
                    <span class="valor-sensivel transition-all duration-300 inline-block">${formatarMoeda(item.totalDia)}</span>
                </td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <div class="fade-in space-y-6 text-left">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div class="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
                        <i class="ph ph-user text-2xl"></i>
                    </div>
                    <div class="overflow-hidden">
                        <p class="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Colaborador</p>
                        <p class="font-bold text-slate-800 text-lg truncate" title="${nomeCliente}">${nomeCliente}</p>
                        <p class="text-sm text-slate-500 mt-0.5">Código: <span class="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">${data.codigo}</span></p>
                    </div>
                </div>

                <div class="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-2xl shadow-md text-white flex flex-col justify-center relative overflow-hidden group">
                    <i class="ph ph-coins absolute -right-4 -bottom-4 text-7xl text-white/10"></i>
                    <div class="relative z-10 flex justify-between items-end">
                        <div>
                            <p class="text-slate-300 text-sm font-medium mb-1 flex items-center gap-2">
                                <i class="ph ph-calculator"></i> Total líquido acumulado
                            </p>
                            <p class="text-3xl font-extrabold tracking-tight">
                                <span class="valor-sensivel transition-all duration-300 inline-block">${formatarMoeda(totalMes)}</span>
                            </p>
                        </div>
                        <button onclick="buscarVales()" class="bg-blue-500 hover:bg-blue-600 text-white p-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95" title="Sincronizar dados">
                            <i class="ph ph-arrows-clockwise text-xl"></i>
                        </button>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div class="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 class="text-slate-700 font-semibold mb-4 flex items-center gap-2">
                        <i class="ph ph-chart-bar text-primary-500"></i> Histórico de Consumo
                    </h3>
                    <div class="relative h-64 w-full">
                        <canvas id="graficoConsumo"></canvas>
                    </div>
                </div>
                <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col h-full overflow-hidden">
                    <div class="p-5 border-b border-slate-100 bg-slate-50/50">
                        <h3 class="text-slate-700 font-semibold flex items-center gap-2">
                            <i class="ph ph-list-dashes text-primary-500"></i> Detalhamento Diário
                        </h3>
                        <p class="text-xs text-slate-400 mt-1">Clique em uma data para ver os itens</p>
                    </div>
                    <div class="overflow-x-auto custom-scrollbar flex-1 max-h-64 lg:max-h-full">
                        <table class="w-full text-sm text-left">
                            <thead class="text-xs text-slate-400 uppercase bg-slate-50 sticky top-0">
                                <tr>
                                    <th scope="col" class="px-4 py-3 font-medium">Data</th>
                                    <th scope="col" class="px-4 py-3 font-medium text-right">Valor (líquido)</th>
                                </tr>
                            </thead>
                            <tbody>${linhasTabela}</tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    renderizarChartJS(labelsGrafico, valoresGrafico);
    
    if (valoresOcultos) {
        valoresOcultos = false; 
        alternarPrivacidade();
    }
}

function renderizarChartJS(labels, data) {
    const ctx = document.getElementById('graficoConsumo').getContext('2d');
    if (graficoInstancia) graficoInstancia.destroy();

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.2)');

    graficoInstancia = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Valor líquido',
                data: data,
                backgroundColor: gradient,
                borderColor: '#3b82f6',
                borderWidth: 1,
                borderRadius: 6,
                barThickness: 'flex',
                maxBarThickness: 32
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1e293b',
                    padding: 12,
                    titleFont: { family: 'Inter', size: 13 },
                    bodyFont: { family: 'Inter', size: 14, weight: 'bold' },
                    callbacks: {
                        label: function(context) { return formatarMoeda(context.raw); }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#f1f5f9', drawBorder: false },
                    ticks: { 
                        font: { family: 'Inter', size: 11 },
                        color: '#94a3b8',
                        callback: function(value) { return 'R$ ' + value; }
                    }
                },
                x: {
                    grid: { display: false, drawBorder: false },
                    ticks: { font: { family: 'Inter', size: 11 }, color: '#64748b' }
                }
            },
            animation: { y: { duration: 1000, easing: 'easeOutQuart' } }
        }
    });
}

// ==================== MODAL DE DETALHES ====================

async function abrirDetalhes(dataStr) {
    if (!codigoAtual) {
        alert('Nenhum código consultado. Faça uma pesquisa primeiro.');
        return;
    }

    vibrar(); 
    
    const modal = document.getElementById('modalDetalhes');
    const conteudo = document.getElementById('modalConteudo');
    modal.classList.remove('hidden');
    conteudo.innerHTML = `
        <div class="flex flex-col items-center justify-center py-8">
            <i class="ph ph-circle-notch text-primary-500 text-4xl animate-spin mb-3"></i>
            <p class="text-slate-500">Carregando itens...</p>
        </div>
    `;

    try {
        const response = await fetch(`${API_URL}?codigo=${encodeURIComponent(codigoAtual)}&data=${encodeURIComponent(dataStr)}`);
        if (!response.ok) throw new Error(`Erro (${response.status})`);
        const dados = await response.json();
        if (dados.error) throw new Error(dados.error);

        const dataObj = new Date(dataStr + 'T12:00:00');
        const dataExibicao = dataObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' });

        const vendas = dados.vendas || [];
        const itensSemVenda = dados.itensSemVenda || [];
        const totalLiquidoDia = dados.totalLiquidoDia || 0;
        const somaBrutaDia = dados.somaBrutaDia || 0;
        const descontoTotal = somaBrutaDia - totalLiquidoDia;

        let html = `
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h2 class="text-xl font-bold text-slate-800">${dataExibicao}</h2>
                    <p class="text-sm text-slate-500">Consumo de ${dados.cliente || ''}</p>
                </div>
                <button onclick="fecharModal()" class="text-slate-400 hover:text-slate-600 shrink-0">
                    <i class="ph ph-x-circle text-2xl"></i>
                </button>
            </div>

            <div class="grid grid-cols-2 gap-3 mb-4">
                <div class="bg-blue-50 p-3 rounded-xl text-center">
                    <p class="text-xs text-slate-500 mb-1">Total líquido</p>
                    <p class="text-xl font-bold text-slate-800">${formatarMoeda(totalLiquidoDia)}</p>
                </div>
                <div class="bg-slate-100 p-3 rounded-xl text-center">
                    <p class="text-xs text-slate-500 mb-1">Soma bruta</p>
                    <p class="text-xl font-bold text-slate-800">${formatarMoeda(somaBrutaDia)}</p>
                </div>
            </div>
            ${descontoTotal > 0 ? `
                <div class="bg-amber-50 border border-amber-100 p-3 rounded-xl mb-4 text-sm text-amber-800 flex items-center gap-2">
                    <i class="ph ph-percent text-lg"></i>
                    <span>Desconto total no dia: <strong>${formatarMoeda(descontoTotal)}</strong></span>
                </div>
            ` : ''}
        `;

        vendas.forEach(venda => {
            const descVenda = venda.totalLiquido !== venda.somaBruta 
                ? `Líquido: ${formatarMoeda(venda.totalLiquido)} | Bruto: ${formatarMoeda(venda.somaBruta)}`
                : `Valor: ${formatarMoeda(venda.totalLiquido)}`;
            html += `
                <div class="mb-3 border border-slate-200 rounded-xl p-3">
                    <div class="flex justify-between items-baseline mb-2">
                        <span class="text-sm font-semibold text-slate-600">Venda ${venda.codigoVenda || 'sem código'}</span>
                        <span class="text-xs text-slate-500">${descVenda}</span>
                    </div>
                    <div class="space-y-1">
                        ${venda.itens.map(item => {
                            const valorTotal = item.quantidade * item.precoUnitario;
                            const descricaoQtd = item.quantidade > 1 ? `<span class="text-xs text-slate-500 ml-1">(${item.quantidade} × ${formatarMoeda(item.precoUnitario)})</span>` : '';
                            return `
                            <div class="grid grid-cols-4 items-center py-1.5 px-2 bg-slate-50 rounded text-sm">
                                <span class="text-slate-700 col-span-2">${item.descricao} ${descricaoQtd}</span>
                                <span class="text-slate-600 text-center font-medium">${item.quantidade}</span>
                                <span class="text-slate-800 text-right font-medium">${formatarMoeda(valorTotal)}</span>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            `;
        });

        if (itensSemVenda.length > 0) {
            html += `
                <div class="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl">
                    <div class="flex items-center gap-2 text-red-700 text-sm font-medium mb-2">
                        <i class="ph ph-warning-octagon"></i>
                        <span>Itens sem vínculo com uma venda finalizada</span>
                    </div>
                    <div class="space-y-1">
                        ${itensSemVenda.map(item => {
                            const valorTotal = item.quantidade * item.precoUnitario;
                            const descricaoQtd = item.quantidade > 1 ? `<span class="text-xs text-slate-500 ml-1">(${item.quantidade} × ${formatarMoeda(item.precoUnitario)})</span>` : '';
                            return `
                            <div class="grid grid-cols-4 items-center py-1.5 px-2 bg-red-50 rounded text-sm">
                                <span class="text-slate-700 col-span-2">${item.descricao} ${descricaoQtd}</span>
                                <span class="text-slate-600 text-center font-medium">${item.quantidade}</span>
                                <span class="text-slate-800 text-right font-medium">${formatarMoeda(valorTotal)}</span>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        conteudo.innerHTML = html;

    } catch (erro) {
        conteudo.innerHTML = `
            <div class="text-red-500 flex items-start gap-3">
                <i class="ph ph-warning-circle text-2xl shrink-0"></i>
                <div>
                    <p class="font-semibold">Erro ao carregar itens</p>
                    <p class="text-sm">${erro.message}</p>
                </div>
            </div>
            <button onclick="fecharModal()" class="mt-4 bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 px-4 rounded-lg text-sm">Fechar</button>
        `;
    }
}

function fecharModal() {
    vibrar();
    document.getElementById('modalDetalhes').classList.add('hidden');
}

document.getElementById('modalDetalhes').addEventListener('click', function(e) {
    if (e.target === this) fecharModal();
});

// ==================== REGISTRO DO SERVICE WORKER E BANNER PWA ====================
let deferredPrompt = null; 

const isIos = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
};

function verificarInstalacao() {
    if (isPwaInstalado()) return;

    if (isIos()) {
        const banner = document.getElementById('pwaInstallerBanner');
        banner.innerHTML = `
            <div class="max-w-4xl mx-auto flex items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                        <i class="ph ph-apple-logo text-xl"></i>
                    </div>
                    <div>
                        <p class="text-sm font-semibold text-slate-800">Instale no iPhone</p>
                        <p class="text-xs text-slate-500">Toque em <b>Compartilhar</b> <i class="ph ph-export"></i> e depois em <b>Adicionar à Tela de Início</b>.</p>
                    </div>
                </div>
                <button onclick="fecharBannerInstalacao()" class="text-slate-400 hover:text-slate-600 p-2 shrink-0">
                    <i class="ph ph-x text-lg"></i>
                </button>
            </div>
        `;
        mostrarBannerInstalacao();
    }
}

window.addEventListener('load', () => {
    setTimeout(verificarInstalacao, 2000); 
});

function isPwaInstalado() {
    return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
}

function mostrarBannerInstalacao() {
    if (isPwaInstalado()) return; 
    
    const banner = document.getElementById('pwaInstallerBanner');
    if (banner) {
        banner.classList.remove('hidden');
        setTimeout(() => {
            banner.classList.add('show-banner');
        }, 50);
    }
}

function fecharBannerInstalacao() {
    const banner = document.getElementById('pwaInstallerBanner');
    if (banner) {
        banner.classList.remove('show-banner'); 
        setTimeout(() => {
            banner.classList.add('hidden');
        }, 300);
    }
    sessionStorage.setItem('pwa-banner-fechado', 'true');
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker registrado:', reg.scope))
            .catch(err => console.error('Falha no Service Worker:', err));
    });
}

window.addEventListener('beforeinstallprompt', (e) => {
    if (!sessionStorage.getItem('pwa-banner-fechado') && !isPwaInstalado()) {
        e.preventDefault();
        deferredPrompt = e;
        mostrarBannerInstalacao();
    }
});

document.getElementById('btnInstalarPwa')?.addEventListener('click', async () => {
    if (!deferredPrompt) return;

    try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`Resultado da instalação: ${outcome}`);
    } catch (err) {
        console.error('Erro ao instalar:', err);
    }

    deferredPrompt = null;
    fecharBannerInstalacao();
});

window.addEventListener('appinstalled', () => {
    fecharBannerInstalacao();
});

if (isPwaInstalado()) {
    fecharBannerInstalacao();
}