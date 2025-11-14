const credenciais = {
    usuario: "admin",
    senha: "admin"
};


document.addEventListener('DOMContentLoaded', function() {
    const formulario = document.getElementById('login');
    
    formulario.addEventListener('submit', function(e) {
        e.preventDefault();
        
        
        const usuarioDigitado = document.getElementById('usuario').value;
        const senhaDigitada = document.getElementById('senha').value;
        
        
        if (usuarioDigitado === credenciais.usuario && senhaDigitada === credenciais.senha) {
            alert('Login realizado com sucesso!');
            window.location.href = 'admin.html';
        } else {
            alert('Usuário ou senha incorretos. Tente novamente.');
            
            document.getElementById('usuario').value = '';
            document.getElementById('senha').value = '';
            document.getElementById('usuario').focus();
        }
    });
});