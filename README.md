# 📦 Sistema de Controle de Materiais e Estoque

Sistema web profissional para controle interno de materiais, estoque e requisições — 100% client-side, sem necessidade de servidor.

## ✨ Funcionalidades

- **Dashboard** — Visão geral com estatísticas, alertas de estoque baixo, gráficos por categoria e consumo por destino
- **Cadastro de Materiais** — CRUD completo com busca, filtros e status ativo/inativo
- **Controle de Estoque** — Entradas/saídas com validação de saldo, histórico de movimentações
- **Requisições Internas** — Criação, entrega com baixa automática, cancelamento, impressão A4
- **Cadastros** — Gerenciamento de categorias e unidades de medida
- **Auditoria** — Log automático de todas as operações

## 🚀 Como Usar

1. Abra `index.html` diretamente no navegador (Chrome, Edge ou Firefox)
2. Ou rode o servidor local:
   ```powershell
   powershell -ExecutionPolicy Bypass -File server.ps1
   ```
   E acesse `http://localhost:8080`

## 🛠️ Tecnologias

- HTML5 + CSS3 + JavaScript (Vanilla)
- IndexedDB para persistência local
- Design responsivo com tema corporativo
- Impressão A4 otimizada

## 📁 Estrutura

```
├── index.html          # Página principal (SPA)
├── server.ps1          # Servidor HTTP local (PowerShell)
├── css/
│   ├── style.css       # Design system
│   └── print.css       # Estilos de impressão
└── js/
    ├── db.js           # Camada de banco de dados (IndexedDB)
    ├── utils.js        # Funções utilitárias
    ├── app.js          # Router e inicialização
    └── pages/
        ├── dashboard.js      # Painel principal
        ├── materials.js      # Cadastro de materiais
        ├── stock.js          # Controle de estoque
        ├── requisitions.js   # Requisições internas
        └── registrations.js  # Cadastro de categorias e unidades
```

## 📄 Licença

Uso privado.
