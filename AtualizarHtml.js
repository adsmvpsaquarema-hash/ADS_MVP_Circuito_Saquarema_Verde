document.addEventListener('DOMContentLoaded', () => {
            
            const idsEventos = ['evento1', 'evento2', 'evento3'];

            const carregarEvento = (id) => {
                try {
                    const dadosString = localStorage.getItem(id);
                    if (!dadosString) {
                        return;
                    }

                    const dados = JSON.parse(dadosString);

                    const articleElemento = document.getElementById(id);
                    if (!articleElemento) {
                        return;
                    }


                    const novoHtml = `
                        <h3>${dados.nome}</h3>
                        <ul>
                            <li>Datas: ${dados.data}</li>
                            <li>Local: ${dados.local}</li>
                            <li>Horário: ${dados.horario}</li>
                        </ul>
                        <br>
                        <p>Mais informações: <a href="${dados.link}" target="_blank">${dados.link}</a></p>
                    `;

                    
                    articleElemento.innerHTML = novoHtml;

                } catch (error) {
                    console.error(`Erro ao carregar evento ${id} do localStorage:`, error);
                }
            };

            
            idsEventos.forEach(id => {
                carregarEvento(id);
            });
        });