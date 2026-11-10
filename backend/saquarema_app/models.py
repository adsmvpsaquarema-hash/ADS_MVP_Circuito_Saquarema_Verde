from django.db import models


class CategoriaAtracao(models.TextChoices):
    TRILHA = 'trilha', 'Trilha'
    PRAIA = 'praia', 'Praia'
    EVENTO = 'evento', 'Evento'
    BIODIVERSIDADE = 'biodiversidade', 'Biodiversidade'


class Evento(models.Model):
    titulo = models.CharField(max_length=200)
    descricao = models.TextField()
    data = models.DateField(null=True, blank=True)
    horario = models.CharField(max_length=100, blank=True)
    local = models.CharField(max_length=200, blank=True)
    link = models.URLField(blank=True)
    imagem = models.ImageField(upload_to='eventos/', blank=True, null=True)
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-data', '-criado_em']

    def __str__(self):
        return self.titulo


class Atracao(models.Model):
    nome = models.CharField(max_length=200)
    categoria = models.CharField(
        max_length=30,
        choices=CategoriaAtracao.choices,
        default=CategoriaAtracao.TRILHA,
    )
    descricao = models.TextField()
    regras = models.TextField(blank=True)
    imagem = models.ImageField(upload_to='atracoes/', blank=True, null=True)
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nome']

    def __str__(self):
        return self.nome


class Noticia(models.Model):
    titulo = models.CharField(max_length=200)
    resumo = models.TextField(blank=True)
    conteudo = models.TextField()
    imagem = models.ImageField(upload_to='noticias/', blank=True, null=True)
    publicada = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-criado_em']

    def __str__(self):
        return self.titulo
