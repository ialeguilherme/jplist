document.addEventListener('DOMContentLoaded', () => {
    const dateTimeSpan = document.getElementById('date-time');
    const temperatureSpan = document.getElementById('temperature');
    const personNameInput = document.getElementById('person-name');
    const priorityTypeSelect = document.getElementById('priority-type');
    const observationInput = document.getElementById('observation'); // Novo: Campo de observação
    const addButton = document.getElementById('add-button');
    const queueList = document.getElementById('queue');
    const resetButton = document.getElementById('reset-button');

    // Inicializa a fila a partir do armazenamento local (para persistência básica)
    let queue = JSON.parse(localStorage.getItem('medicalQueue')) || [];

    // Função para atualizar data, hora e temperatura (simulada)
    function updateDateTimeAndTemperature() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        dateTimeSpan.textContent = now.toLocaleDateString('pt-BR', options);

        // Simula a temperatura com um valor aleatório
        const temperature = (Math.random() * (28 - 22) + 22).toFixed(1); // Entre 22 e 28 graus
        temperatureSpan.textContent = `Temp: ${temperature}°C`;
    }

    // Adiciona o item à fila no DOM
    function addPersonToDOM(person) {
        const listItem = document.createElement('li');
        listItem.classList.add('queue-item', person.type);
        listItem.dataset.id = person.id; // Para identificar ao remover ou reordenar

        const timeAdded = new Date(person.timeAdded).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        // Adicionando a observação se existir
        const observationHtml = person.observation ? `<p class="queue-item-observation">${person.observation}</p>` : '';

        listItem.innerHTML = `
            <div class="queue-item-content">
                <div class="queue-item-info">
                    <span class="queue-item-name">${person.name}</span>
                    <span class="queue-item-time">Adicionado às: ${timeAdded}</span>
                    ${observationHtml} </div>
                <div class="queue-item-actions">
                    <button class="remove-button">Remover</button>
                </div>
            </div>
        `;
        queueList.appendChild(listItem);

        // Adiciona evento de remover ao botão dentro do item
        listItem.querySelector('.remove-button').addEventListener('click', () => {
            removePerson(person.id);
        });
    }

    // Renderiza todos os itens da fila
    function renderQueue() {
        queueList.innerHTML = ''; // Limpa a lista antes de renderizar
        queue.forEach(person => addPersonToDOM(person));
        saveQueue(); // Salva a fila após renderizar (garante persistência ao carregar)
    }

    // Adiciona uma nova pessoa à fila
    addButton.addEventListener('click', () => {
        const name = personNameInput.value.trim();
        const type = priorityTypeSelect.value;
        const observation = observationInput.value.trim(); // Novo: Captura a observação

        if (name) {
            const newPerson = {
                id: Date.now(), // ID único baseado no timestamp
                name: name,
                type: type,
                timeAdded: new Date().toISOString(), // Salva a hora de adição
                observation: observation // Novo: Adiciona a observação
            };
            queue.push(newPerson);
            addPersonToDOM(newPerson);
            personNameInput.value = ''; // Limpa o input
            priorityTypeSelect.value = 'normal'; // Reseta o tipo
            observationInput.value = ''; // Novo: Limpa a observação
            saveQueue(); // Salva a fila após adicionar
        } else {
            alert('Por favor, insira o nome da pessoa.');
        }
    });

    // Remove uma pessoa da fila
    function removePerson(id) {
        // Confirmação antes de remover
        if (confirm('Tem certeza que deseja remover esta pessoa da fila?')) {
            queue = queue.filter(person => person.id !== id);
            renderQueue(); // Renderiza novamente para refletir a remoção
        }
    }

    // Zera a fila
    resetButton.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja zerar a fila? Esta ação não pode ser desfeita.')) {
            queue = [];
            renderQueue(); // Limpa o DOM e o armazenamento
        }
    });

    // Salva a fila no localStorage
    function saveQueue() {
        localStorage.setItem('medicalQueue', JSON.stringify(queue));
    }

    // Configuração do Dragula para reordenar
    dragula([queueList]).on('drop', (el, target, source, sibling) => {
        // Atualiza o array 'queue' com a nova ordem
        const newQueue = [];
        Array.from(queueList.children).forEach(item => {
            const id = parseInt(item.dataset.id);
            const person = queue.find(p => p.id === id);
            if (person) {
                newQueue.push(person);
            }
        });
        queue = newQueue;
        saveQueue(); // Salva a fila após reordenar
    });

    // Inicializa a exibição
    updateDateTimeAndTemperature();
    setInterval(updateDateTimeAndTemperature, 60000); // Atualiza a cada minuto
    renderQueue(); // Carrega a fila ao iniciar a página
});