document.addEventListener('DOMContentLoaded', () => {
            const form = document.getElementById('form-novo-evento');
            const message = document.getElementById('confirmation-message');

            form.addEventListener('submit', (e) => {
                e.preventDefault();

                
                const slot = document.getElementById('evento-slot').value; 
                const nome = document.getElementById('evento-nome').value;
                const data = document.getElementById('evento-data').value;
                const local = document.getElementById('evento-local').value;
                const horario = document.getElementById('evento-horario').value;
                const link = document.getElementById('evento-link').value;

                
                const eventoData = {
                    nome: nome,
                    data: data,
                    local: local,
                    horario: horario,
                    link: link
                };

                try {
                   
                    localStorage.setItem(slot, JSON.stringify(eventoData));

                    message.style.backgroundColor = '#d4edda';
                    message.style.color = '#155724';
                    message.innerText = 'Evento salvo com sucesso! A mudança será visível na página principal.';
                    message.style.display = 'block';
                    
                    setTimeout(() => {
                        message.style.display = 'none';
                    }, 3000);

                } catch (error) {
                    console.error("Erro ao salvar no localStorage: ", error);
                    message.style.backgroundColor = '#f8d7da';
                    message.style.color = '#721c24';
                    message.innerText = 'Erro ao salvar. O armazenamento pode estar cheio.';
                    message.style.display = 'block';
                }
            });
        });