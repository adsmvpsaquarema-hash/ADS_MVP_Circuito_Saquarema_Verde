from rest_framework import serializers
from .models import Atracao, Evento


class EventoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evento
        fields = [
            'id',
            'titulo',
            'descricao',
            'data',
            'horario',
            'local',
            'link',
            'ativo',
            'criado_em',
            'atualizado_em',
        ]


class AtracaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Atracao
        fields = [
            'id',
            'nome',
            'categoria',
            'descricao',
            'regras',
            'imagem',
            'ativo',
            'criado_em',
            'atualizado_em',
        ]
