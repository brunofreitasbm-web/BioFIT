# Envio das séries para o Google Sheets

O app grava cada série no aparelho e, em seguida, envia para a planilha. Sem rede, as séries
ficam numa fila e seguem quando a conexão voltar (também ao reabrir o app).

## Instalação (uma vez)

1. Abra a planilha no Google Sheets → **Extensões → Apps Script**.
2. Cole o conteúdo de `Code.gs` e salve.
3. **Configurações do projeto (engrenagem) → Propriedades do script → Adicionar**:
   `TOKEN` = uma senha longa e aleatória (ex.: 32 caracteres).
4. **Implantar → Nova implantação → Tipo: App da Web**
   - Executar como: **Eu**
   - Quem tem acesso: **Qualquer pessoa**
5. Copie a URL terminada em `/exec`.
6. No app: **Relatório → Planilha Google**, cole a URL e o mesmo token, e toque em **Salvar**.
   Use **Reenviar histórico** uma vez para levar o que já foi registrado.

As linhas vão para a aba **Dados do app** (criada automaticamente). Chave de cada linha:
`data|exercício|série` — editar uma série atualiza a linha em vez de duplicar.

## Segurança

"Qualquer pessoa" é necessário porque o app chama a URL direto do navegador. Quem tiver a URL
**e** o token consegue escrever na aba. A URL e o token ficam só no `localStorage` do seu
aparelho (não vão para o repositório nem entram no backup). Para trocar o token, altere a
propriedade `TOKEN` e salve de novo no app.

## Depois de alterar o `Code.gs`

Implantar → **Gerenciar implantações** → editar → **Nova versão**. Sem isso a URL continua
servindo o código antigo.
