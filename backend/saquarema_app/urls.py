from django.urls import path

from .views import atracao_list, evento_list, home

urlpatterns = [
    path('', home, name='home'),
    path('api/eventos/', evento_list, name='api_eventos'),
    path('api/atracoes/', atracao_list, name='api_atracoes'),
]
