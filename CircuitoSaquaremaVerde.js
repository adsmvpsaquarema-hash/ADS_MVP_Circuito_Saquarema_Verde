let imagens = ["Pedra_Branca.jpg", "lagoa.jpg", "vilatur.jpg"];
let i = 0;
let img = document.getElementById("img-slide");

setInterval(() => {
    img.style.opacity = 0;
    setTimeout(() => {
        i = (i + 1) % imagens.length;
        img.src = imagens[i];
        img.style.opacity = 1;
    }, 800);
}, 4000);
