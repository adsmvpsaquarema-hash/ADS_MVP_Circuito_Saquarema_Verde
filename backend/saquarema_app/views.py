from django.http import JsonResponse

from .models import Atracao, Evento


def home(request):
    return JsonResponse({
        'message': 'Saquarema Verde API iniciada.',
        'status': 'ok',
        'app': 'saquarema_app',
    })


def evento_list(request):
    eventos = Evento.objects.filter(ativo=True).order_by('-data')
    dados = [
        {
            'id': evento.id,
            'titulo': evento.titulo,
            'descricao': evento.descricao,
            'data': evento.data.isoformat() if evento.data else None,
            'horario': evento.horario,
            'local': evento.local,
            'link': evento.link,
        }
        for evento in eventos
    ]
    return JsonResponse({'eventos': dados})


def atracao_list(request):
    atracoes = Atracao.objects.filter(ativo=True).order_by('nome')
    dados = [
        {
            'id': atracao.id,
            'nome': atracao.nome,
            'categoria': atracao.categoria,
            'descricao': atracao.descricao,
            'regras': atracao.regras,
            'imagem': atracao.imagem,
        }
        for atracao in atracoes
    ]
    return JsonResponse({'atracoes': dados})
