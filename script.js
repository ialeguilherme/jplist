document.addEventListener('DOMContentLoaded', () => {
    const dateTimeSpan = document.getElementById('date-time');
    const temperatureSpan = document.getElementById('temperature');
    const personNameInput = document.getElementById('person-name');
    const priorityTypeSelect = document.getElementById('priority-type');
    const observationInput = document.getElementById('observation');
    const addButton = document.getElementById('add-button');
    const queueList = document.getElementById('queue');
    const resetButton = document.getElementById('reset-button');

    // ** 1. Inicialização do Supabase **
    const SUPABASE_URL = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmaG5naHlxbWR1aXlpY2ZxZHRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0NTA4NjUsImV4cCI6MjA2ODAyNjg2NX0._UKv8z0MIC96q4oMFU6vZkMCUUjolxf86LizMCaDtxo'; // Substitua pela sua URL do Supabase
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmaG5naHlxbWR1aXlpY2ZxZHRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ1MDg2NSwiZXhwIjoyMDY4MDI2ODY1fQ.ABIfz3Gf29cUP_6Mq4_1VE5zndw5lYwXL6Eial-Q19E'; // Substitua pela sua chave anon public

    const supabase = supabase_js.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    let queue = []; // A fila será carregada do Supabase

    // Função para atualizar data, hora e temperatura (simulada)
    function updateDateTimeAndTemperature() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        dateTimeSpan.textContent = now.toLocaleDateString('pt-BR', options);

        const temperature = (Math.random() * (28 - 22) + 22).toFixed(1); // Entre 22 e 28 graus
        temperatureSpan.textContent = `Temp: ${temperature}°C`;
    }

    // Adiciona o item à fila no DOM
    function addPersonToDOM(person) {
        const listItem = document.createElement('li');
        listItem.classList.add('queue-item', person.type);
        listItem.dataset.id = person.id; // Supabase ID (UUID)

        const timeAdded = new Date(person.time_added).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

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
        // Ordena a fila localmente para garantir a ordem correta na UI antes de renderizar
        // Supabase não garante ordem de retorno por padrão, precisamos gerenciar isso.
        // A reordenação será um desafio, e talvez precisemos de uma coluna de 'order' no DB.
        // Por enquanto, apenas exibe na ordem que vem ou a ordem que é reconstruída.
        queue.forEach(person => addPersonToDOM(person));
    }

    // ** 2. Carregar a fila do Supabase **
    async function loadQueue() {
        const { data, error } = await supabase
            .from('queue_items') // Substitua pelo nome da sua tabela
            .select('*')
            .order('time_added', { ascending: true }); // Ordena pela hora de adição inicialmente

        if (error) {
            console.error('Erro ao carregar a fila:', error);
            alert('Erro ao carregar a fila. Verifique o console.');
        } else {
            queue = data; // Atualiza a fila local com os dados do Supabase
            renderQueue();
        }
    }

    // ** 3. Adicionar uma nova pessoa à fila no Supabase **
    addButton.addEventListener('click', async () => {
        const name = personNameInput.value.trim();
        const type = priorityTypeSelect.value;
        const observation = observationInput.value.trim();

        if (name) {
            const { data, error } = await supabase
                .from('queue_items') // Substitua pelo nome da sua tabela
                .insert([
                    { name: name, type: type, observation: observation } // time_added será automático no DB
                ])
                .select(); // Pede para retornar o item inserido

            if (error) {
                console.error('Erro ao adicionar pessoa:', error);
                alert('Erro ao adicionar pessoa. Verifique o console.');
            } else {
                // A sincronização em tempo real (no listener abaixo) vai adicionar ao DOM.
                // Não precisamos adicionar via `addPersonToDOM` aqui diretamente.
                personNameInput.value = '';
                priorityTypeSelect.value = 'normal';
                observationInput.value = '';
            }
        } else {
            alert('Por favor, insira o nome da pessoa.');
        }
    });

    // ** 4. Remover uma pessoa da fila no Supabase **
    async function removePerson(id) {
        if (confirm('Tem certeza que deseja remover esta pessoa da fila?')) {
            const { error } = await supabase
                .from('queue_items') // Substitua pelo nome da sua tabela
                .delete()
                .eq('id', id); // Onde a coluna 'id' é igual ao ID fornecido

            if (error) {
                console.error('Erro ao remover pessoa:', error);
                alert('Erro ao remover pessoa. Verifique o console.');
            } else {
                // A sincronização em tempo real (no listener abaixo) vai remover do DOM.
                // Não precisamos de renderQueue() aqui.
            }
        }
    }

    // ** 5. Zerar a fila no Supabase **
    resetButton.addEventListener('click', async () => {
        if (confirm('Tem certeza que deseja zerar a fila? Esta ação não pode ser desfeita.')) {
            const { error } = await supabase
                .from('queue_items') // Substitua pelo nome da sua tabela
                .delete()
                .neq('id', 'null'); // Deleta todas as linhas (cuidado com esta condição)

            if (error) {
                console.error('Erro ao zerar a fila:', error);
                alert('Erro ao zerar a fila. Verifique o console.');
            } else {
                // A sincronização em tempo real (no listener abaixo) vai limpar o DOM.
                // Não precisamos de renderQueue() aqui.
            }
        }
    });

    // ** 6. Configuração do Dragula para reordenar (desafio com Supabase) **
    // O Dragula reordena visualmente, mas o Supabase não tem uma ordem intrínseca de linhas.
    // Para persistir a ordem, você precisaria de uma coluna 'order' ou 'position' na sua tabela
    // e atualizá-la no Supabase após cada drop do Dragula. Isso é mais complexo.
    // Por enquanto, vamos manter o Dragula para a experiência visual, mas a ordem não será persistida
    // entre as sessões ou sincronizada com outros dispositivos sem lógica adicional.
    dragula([queueList]).on('drop', async (el, target, source, sibling) => {
        // Obter os IDs na nova ordem do DOM
        const orderedIds = Array.from(queueList.children).map(item => item.dataset.id);

        // AQUI ESTÁ O DESAFIO: Para persistir esta ordem no Supabase,
        // você precisaria:
        // 1. Adicionar uma coluna `position` (inteiro) na sua tabela `queue_items`.
        // 2. Ao inserir um novo item, dar-lhe a próxima posição disponível.
        // 3. Ao reordenar, iterar sobre `orderedIds` e atualizar a `position` de cada item no Supabase.
        //    Isso envolveria múltiplas chamadas `update` ou uma única RPC para o Supabase.
        // Isso é mais complexo e está além do escopo de uma "solução fácil" inicial.
        // Por ora, a reordenação é apenas visual e local.
        console.log("Item reordenado visualmente. Persistência da ordem requer mais lógica no Supabase.");

        // Reconstrua a fila localmente na ordem correta para que o listener não bagunce ao receber updates
        const newQueue = [];
        Array.from(queueList.children).forEach(item => {
            const id = item.dataset.id;
            const person = queue.find(p => p.id === id); // Use id (string) para UUID
            if (person) {
                newQueue.push(person);
            }
        });
        queue = newQueue;
        // Não chamamos saveQueue() aqui, pois não usamos localStorage.
        // A persistência da ordem exigiria um UPDATE no Supabase.
    });


    // ** 7. Sincronização em Tempo Real (Realtime) **
    supabase
        .channel('public:queue_items') // Ou o nome da sua tabela
        .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_items' }, payload => {
            console.log('Change received!', payload);
            if (payload.eventType === 'INSERT') {
                queue.push(payload.new);
            } else if (payload.eventType === 'UPDATE') {
                // Encontre o item e atualize-o
                const index = queue.findIndex(item => item.id === payload.old.id);
                if (index !== -1) {
                    queue[index] = payload.new;
                }
            } else if (payload.eventType === 'DELETE') {
                queue = queue.filter(item => item.id !== payload.old.id);
            }
            // Re-renderiza a fila sempre que houver uma mudança
            renderQueue();
        })
        .subscribe();

    // Inicializa a exibição
    updateDateTimeAndTemperature();
    setInterval(updateDateTimeAndTemperature, 60000); // Atualiza a cada minuto

    // Carrega a fila do Supabase ao iniciar a página
    loadQueue();
});
