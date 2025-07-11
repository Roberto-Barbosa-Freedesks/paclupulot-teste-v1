# Pac-Lúpulo da Cervejaria Campinas

## 🍺 Sobre o Projeto

O **Pac-Lúpulo** é um jogo personalizado no estilo Pac-Man, desenvolvido especialmente para a Cervejaria Campinas. O jogo foi criado com o objetivo de captar leads, gerar engajamento com o público e, através das pontuações e dados registrados dos usuários, gerar estratégias de marketing, relacionamento e ativações de vendas por gamificação.

## 🎮 Características do Jogo

### Personalização da Cervejaria Campinas
- **Avatares Personalizados**: Forasteira IPA, IPA Zero e Pilsen
- **Elementos Temáticos**: Lúpulos substituem os dots energizadores
- **Canecas Especiais**: Power-ups representados por canecas da cervejaria
- **Identidade Visual**: Cores e design alinhados com a marca

### Funcionalidades Principais
- **Sistema de Autenticação**: Login e cadastro com Firebase
- **Ranking Cervejeiro**: Sistema de pontuação e classificação
- **Sistema de Conquistas**: Achievements gamificados
- **Analytics Avançados**: Tracking detalhado de gameplay
- **Responsividade**: Compatível com desktop e mobile
- **Integração IBGE**: Seleção automática de estados e cidades

## 🚀 Tecnologias Utilizadas

### Frontend
- **HTML5**: Estrutura semântica e acessível
- **CSS3**: Animações, gradientes e design responsivo
- **JavaScript ES6+**: Lógica do jogo e interações
- **Canvas API**: Renderização do jogo

### Backend e Dados
- **Firebase Authentication**: Sistema de login seguro
- **Cloud Firestore**: Banco de dados em tempo real
- **Firebase Functions**: Processamento serverless
- **API IBGE**: Integração para estados e cidades

### Recursos Avançados
- **Sistema de Notificações**: Feedback visual em tempo real
- **Progressive Web App**: Instalável em dispositivos móveis
- **Service Workers**: Cache e performance otimizada
- **Analytics**: Tracking de eventos e sessões

## 📁 Estrutura do Projeto

```
paclupulo-campinas/
├── index.html              # Página principal
├── pacman.js               # Loader e autenticação
├── pacman-original.js      # Engine principal do jogo
├── custom-renderer.js      # Renderização personalizada
├── achievements.js         # Sistema de conquistas
├── font/                   # Fontes personalizadas
│   ├── ARCADE_R.TTF
│   └── PressStart2P.ttf
├── img/                    # Imagens e sprites
│   ├── capa.jpg           # Tela inicial
│   ├── forasteira.png     # Avatar Forasteira IPA
│   ├── ipazero.png        # Avatar IPA Zero
│   ├── pilsen.png         # Avatar Pilsen
│   ├── lupulo.png         # Lúpulo (power-up)
│   └── caneca.png         # Caneca (energizer)
├── sounds/                 # Efeitos sonoros
│   ├── coffee-break-music.mp3
│   ├── eating.mp3
│   ├── ghost-*.mp3
│   └── start-music.mp3
└── icon/                   # Ícones e favicons
    ├── favicon.png
    └── ios_icon.png
```

## 🛠️ Instalação e Configuração

### Pré-requisitos
- Servidor web (Apache, Nginx, ou servidor local)
- Conexão com internet (para Firebase e API IBGE)
- Navegador moderno com suporte a HTML5 Canvas

### Configuração do Firebase

1. **Criar Projeto no Firebase**:
   - Acesse [Firebase Console](https://console.firebase.google.com/)
   - Crie um novo projeto
   - Ative Authentication e Firestore

2. **Configurar Authentication**:
   - Ative o provedor "Email/Senha"
   - Configure domínios autorizados

3. **Configurar Firestore**:
   - Crie as coleções: `players`, `analytics`, `sessions`
   - Configure regras de segurança apropriadas

4. **Atualizar Configuração**:
   ```javascript
   const firebaseConfig = {
     apiKey: "SUA_API_KEY",
     authDomain: "SEU_PROJETO.firebaseapp.com",
     projectId: "SEU_PROJETO_ID",
     storageBucket: "SEU_PROJETO.appspot.com",
     messagingSenderId: "SEU_SENDER_ID",
     appId: "SEU_APP_ID"
   };
   ```

### Instalação Local

1. **Clone ou extraia os arquivos**:
   ```bash
   # Se usando Git
   git clone [URL_DO_REPOSITORIO]
   
   # Ou extraia o ZIP fornecido
   unzip paclupulo-campinas-final.zip
   ```

2. **Configure um servidor local**:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Node.js (com http-server)
   npx http-server
   
   # PHP
   php -S localhost:8000
   ```

3. **Acesse o jogo**:
   - Abra `http://localhost:8000` no navegador

## 🎯 Como Usar

### Para Jogadores

1. **Acesso Inicial**:
   - Clique em "TOQUE PARA JOGAR" na tela inicial
   - Faça login ou cadastre-se

2. **Cadastro**:
   - Preencha todos os campos obrigatórios
   - Selecione seu estado e cidade
   - Crie uma senha segura (mín. 6 caracteres)

3. **Gameplay**:
   - Use as setas do teclado para mover
   - Colete lúpulos para ganhar pontos
   - Evite os fantasmas
   - Colete canecas para poder comer fantasmas

4. **Ranking e Conquistas**:
   - Clique em "Pontos" para ver seu ranking
   - Desbloqueie conquistas jogando
   - Compete com outros cervejeiros

### Para Administradores

1. **Analytics no Firebase**:
   - Acesse o Console do Firebase
   - Visualize dados em `analytics` e `sessions`
   - Monitore engajamento e retenção

2. **Gestão de Usuários**:
   - Visualize usuários em `Authentication`
   - Analise dados demográficos em `players`
   - Exporte dados para campanhas de marketing

## 📊 Métricas e Analytics

### Dados Coletados
- **Demográficos**: Nome, email, WhatsApp, localização
- **Gameplay**: Pontuações, níveis, tempo de jogo
- **Engajamento**: Frequência de jogo, conquistas
- **Sessões**: Duração, performance, dispositivo

### Relatórios Disponíveis
- **Ranking de Jogadores**: Top performers
- **Análise Geográfica**: Distribuição por região
- **Retenção**: Frequência de retorno
- **Conquistas**: Progresso dos usuários

## 🔧 Personalização

### Modificar Avatares
1. Substitua as imagens em `/img/`
2. Mantenha as dimensões originais
3. Use formato PNG com transparência

### Ajustar Pontuação
1. Edite `pacman-original.js`
2. Modifique valores em `addScore()`
3. Ajuste condições de conquistas

### Personalizar Conquistas
1. Edite `achievements.js`
2. Adicione novas conquistas no objeto `achievements`
3. Defina condições e recompensas

## 🛡️ Segurança e Performance

### Medidas de Segurança
- **Validação de Entrada**: Todos os campos são validados
- **Sanitização**: Dados são limpos antes do armazenamento
- **Rate Limiting**: Proteção contra spam
- **HTTPS**: Comunicação criptografada com Firebase

### Otimizações de Performance
- **Preload**: Recursos críticos carregados antecipadamente
- **Lazy Loading**: Carregamento sob demanda
- **Minificação**: Código otimizado para produção
- **Cache**: Estratégias de cache implementadas

## 📱 Compatibilidade

### Navegadores Suportados
- **Chrome**: 80+
- **Firefox**: 75+
- **Safari**: 13+
- **Edge**: 80+

### Dispositivos
- **Desktop**: Windows, macOS, Linux
- **Mobile**: iOS 13+, Android 8+
- **Tablet**: iPad, Android tablets

## 🐛 Solução de Problemas

### Problemas Comuns

1. **Jogo não carrega**:
   - Verifique conexão com internet
   - Confirme configuração do Firebase
   - Teste em navegador atualizado

2. **Erro de autenticação**:
   - Verifique domínio autorizado no Firebase
   - Confirme configuração de Authentication
   - Teste com email válido

3. **Pontuação não salva**:
   - Verifique regras do Firestore
   - Confirme conexão com internet
   - Teste login/logout

### Logs e Debug
- Abra DevTools (F12)
- Verifique Console para erros
- Monitore Network para requisições
- Use Firebase Debug Mode

## 📞 Suporte

### Contato Técnico
- **Desenvolvedor**: FreeDESKS
- **Email**: [contato@freedesks.com]
- **Documentação**: Este README.md

### Cervejaria Campinas
- **Execução**: Roberto Barbosa, Adalgisa Caruso
- **Design**: Gian Pietro
- **Website**: https://www.cervejariacampinas.com.br/

## 📄 Licença

Este projeto foi desenvolvido exclusivamente para a Cervejaria Campinas. Todos os direitos reservados.

### Créditos
- **Engine Base**: Pac-Man HTML5 (modificado)
- **Desenvolvimento**: FreeDESKS
- **Design**: Gian Pietro
- **Conceito**: Cervejaria Campinas

---

**Versão**: 2.0  
**Data**: Julho 2025  
**Status**: Produção Ready ✅

