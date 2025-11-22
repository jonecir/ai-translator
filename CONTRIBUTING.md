# Contributing to AI Translator

🇺🇸 **English** · 🇧🇷 **Português**  

---

## 🧭 Overview · Visão geral

Thank you for your interest in contributing to **AI Translator**!  
Obrigado por se interessar em contribuir com o **AI Translator**! 🙌

This document explains how we organize work, branches and pull requests.  
Este documento explica como organizamos trabalho, branches e pull requests.

---

## 🧱 Branches

- **main**  
  - Production-ready, always stable  
  - Branch de produção, sempre estável  

- **dev**  
  - Active development, integration of new features  
  - Desenvolvimento ativo, integração de novas features  

- **feature/\***  
  - One branch per feature or bugfix  
  - Uma branch por feature ou correção  

Examples / Exemplos:
- `feature/login-i18n`
- `feature/jobs-metrics-modal`
- `fix/glossary-crash`

---

## 🔁 Workflow

1. Make sure you are up to date on `dev`  
   Certifique-se de estar atualizado na `dev`:

   ```bash
   git checkout dev
   git pull

2. Create a feature branch
Crie uma branch de feature:
git checkout -b feature/my-feature-name

3. Make commits

Small commits

Clear messages

No credentials

Commits pequenos
Mensagens claras
Sem credenciais

4. Push the feature branch
Envie a branch:
git push -u origin feature/my-feature-name

5. Open Pull Request targeting dev
Abra um Pull Request direcionado à dev.
✅ Pull Request Guidelines · Diretrizes de PR

When opening a PR, please:
Ao abrir um PR:

Provide a clear title · Forneça um título claro

Explain what was changed and why · Explique o que mudou e por quê

Add screenshots if UI changed · Adicione screenshots se UI mudou

Link issues (if any) · Relacione issues se existirem
Ex: Closes #12

🧪 Tests
Backend:
cd backend
pytest

Frontend:
cd frontend
npm test

If no automated tests exist, describe manual testing.
Se não houver testes automáticos, descreva o teste manual.

💬 Communication

Both English and Portuguese are welcome in discussions.
Tanto inglês quanto português são aceitos nas discussões.

Thank you for helping improve AI Translator! 🙏
Obrigado por ajudar a melhorar o AI Translator! 🙏


