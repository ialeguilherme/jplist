document.addEventListener('DOMContentLoaded', () => {
    const dateTimeSpan = document.getElementById('date-time');
    const temperatureSpan = document.getElementById('temperature');
    const personNameInput = document.getElementById('person-name');
    const priorityTypeSelect = document.getElementById('priority-type');
    const observationInput = document.getElementById('observation');
    const addButton = document.getElementById('add-button');
    const queueList = document.getElementById('queue');
    const resetButton = document.getElementById('reset-button');

    let queue = []; // A fila será carregada da planilha

    // **COLE A URL DO SEU GOOGLE APPS SCRIPT AQUI**
    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxTOHxB3oN76_NOyVpVfKWqQHTNRKquz6kCBT4rgXoESRfGwjhvcWT1fLifiL7NOxw/exec'; 

    // Função para atualizar data, hora e temperatura (simulada)
    function updateDateTimeAndTemperature() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        dateTimeSpan.textContent = now.toLocaleDateString('pt-BR', options);

        const temperature = (Math.random() * (28 - 22) + 22).toFixed(1);
        temperatureSpan.textContent = `Temp: ${temperature}°C`;
    }

    // Adiciona o item à fila no DOM
    function addPersonToDOM(person) {
        const listItem = document.createElement('li');
        listItem.classList.add('queue-item', person.type);
        listItem.dataset.id = person.id;

        const timeAdded = new Date(person.timeAdded).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const observationHtml = person.observation ? `<p class="queue-item-observation">${person.observation}</p>` : '';

        listItem.innerHTML = `
            <div class="queue-item-content">
                <div class="queue-item-info">
                    <span class="queue-item-name">${person.name}</span>
                    <span class="queue-item-time">Adicionado às: ${timeAdded}</span>
                    ${observationHtml}
                </div>
                <div class="queue-item-actions">
                    <button class="remove-button">Remover</button>
                </div>
            </div>
        `;
        queueList.appendChild(listItem);

        listItem.querySelector('.remove-button').addEventListener('click', () => {
            removePerson(person.id);
        });
    }

    // Renderiza todos os itens da fila
    function renderQueue() {
        queueList.innerHTML = '';
        if (Array.isArray(queue)) {
            // Ordena a fila antes de renderizar (se necessário, por exemplo, por hora de adição)
            const sortedQueue = [...queue].sort((a, b) => new Date(a.timeAdded) - new Date(b.timeAdded));
            sortedQueue.forEach(person => addPersonToDOM(person));
        }
    }

    // **NOVO: Função para buscar a fila da planilha**
    async function fetchQueueFromSheet() {
        try {
            const response = await fetch(WEB_APP_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            queue = data || []; // Garante que queue é um array, mesmo se vazio
            renderQueue();
        } catch (error) {
            console.error('Erro ao buscar fila da planilha:', error);
            alert('Não foi possível carregar a fila. Verifique sua conexão ou a configuração da planilha/script.');
        }
    }

    // **NOVO: Função para enviar requisições POST para o Web App**
    async function sendRequestToWebApp(action, payload = {}) {
        try {
            const response = await fetch(WEB_APP_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action, ...payload }),
            });
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message || 'Erro desconhecido na operação.');
            }
            console.log(result.message);
            return result;
        } catch (error) {
            console.error('Erro na comunicação com o Web App:', error);
            alert(`Erro na operação: ${error.message}`);
            return { success: false, message: error.message };
        } finally {
            // Após qualquer operação (adicionar, remover, zerar), recarrega a fila para garantir sincronização
            fetchQueueFromSheet();
        }
    }

    // Adiciona uma nova pessoa à fila (AGORA INTERAGE COM WEB APP)
    addButton.addEventListener('click', async () => {
        const name = personNameInput.value.trim();
        const type = priorityTypeSelect.value;
        const observation = observationInput.value.trim();

        if (name) {
            const newPerson = {
                // O ID será gerado pelo Apps Script para garantir unicidade com a planilha
                name: name,
                type: type,
                timeAdded: new Date().toISOString(), // Salva em formato ISO para fácil conversão
                observation: observation
            };
            
            const result = await sendRequestToWebApp('add', { person: newPerson });
            if (result.success) {
                personNameInput.value = '';
                priorityTypeSelect.value = 'normal';
                observationInput.value = '';
                // fetchQueueFromSheet() é chamado no 'finally' de sendRequestToWebApp
            }
        } else {
            alert('Por favor, insira o nome da pessoa.');
        }
    });

    // Remove uma pessoa da fila (AGORA INTERAGE COM WEB APP)
    async function removePerson(id) {
        if (confirm('Tem certeza que deseja remover esta pessoa da fila?')) {
            const result = await sendRequestToWebApp('remove', { id: id });
            if (result.success) {
                // fetchQueueFromSheet() é chamado no 'finally' de sendRequestToWebApp
            }
        }
    }

    // Zera a fila (AGORA INTERAGE COM WEB APP)
    resetButton.addEventListener('click', async () => {
        if (confirm('Tem certeza que deseja zerar a fila? Esta ação não pode ser desfeita.')) {
            const result = await sendRequestToWebApp('reset');
            if (result.success) {
                // fetchQueueFromSheet() é chamado no 'finally' de sendRequestToWebApp
            }
        }
    });

    // Configuração do Dragula para reordenar
    // OBS: A reordenação via Dragula é visual no frontend, mas salvar a nova ordem em uma planilha
    // é bem mais complexo, pois planilhas não são otimizadas para isso.
    // Você precisaria:
    // 1. Obter a nova ordem dos IDs no DOM.
    // 2. Enviar uma requisição ao Apps Script para atualizar a "ordem" de cada item na planilha
    //    ou, mais complexo, reescrever a planilha inteira na nova ordem.
    // Por simplicidade, vou manter a reordenação visual, mas ela NÃO será persistida
    // na planilha a menos que você adicione essa lógica complexa de atualização.
    // A cada `fetchQueueFromSheet()`, a ordem da planilha será a "verdadeira".
    dragula([queueList]).on('drop', (el, target, source, sibling) => {
        // Esta parte do código ainda opera apenas no DOM.
        // Se a ordem precisa ser persistida, você terá que implementar a lógica
        // de atualizar o campo 'order' na planilha para cada item e enviar via sendRequestToWebApp.
        // Por exemplo:
        // const newOrder = Array.from(queueList.children).map((item, index) => ({
        //     id: parseInt(item.dataset.id),
        //     order: index
        // }));
        // sendRequestToWebApp('updateOrder', { order: newOrder }); // Requer nova ação no Apps Script
    });

    // Inicializa a exibição
    updateDateTimeAndTemperature();
    setInterval(updateDateTimeAndTemperature, 60000); // Atualiza a cada minuto
    
    // **NOVO: Carrega a fila quando a página é carregada**
    fetchQueueFromSheet();
});
