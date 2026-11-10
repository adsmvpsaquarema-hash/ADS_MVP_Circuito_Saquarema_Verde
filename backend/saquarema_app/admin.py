from django.contrib import admin

from .models import Atracao, Evento, Noticia


@admin.register(Evento)
class EventoAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'data', 'local', 'ativo')
    list_filter = ('ativo', 'data')
    search_fields = ('titulo', 'local')


@admin.register(Atracao)
class AtracaoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'categoria', 'ativo')
    list_filter = ('categoria', 'ativo')
    search_fields = ('nome', 'descricao')


@admin.register(Noticia)
class NoticiaAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'publicada', 'criado_em')
    list_filter = ('publicada',)
    search_fields = ('titulo', 'resumo', 'conteudo')
