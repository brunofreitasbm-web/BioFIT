/**
 * Recebe as séries do app Treino e grava na aba "Dados do app" (upsert pela chave da série).
 *
 * Instalação: veja README.md nesta pasta.
 * O token fica em Configurações do projeto → Propriedades do script → TOKEN (não no código).
 */
var ABA = 'Dados do app';
var COLUNAS = ['chave', 'data', 'sessao', 'exercicioId', 'exercicio', 'grupo', 'serie',
  'cargaKg', 'reps', 'rir', 'observacoes', 'registradoEm'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var corpo = JSON.parse(e.postData.contents);
    var token = PropertiesService.getScriptProperties().getProperty('TOKEN');
    if (!token || corpo.token !== token) return resposta({ ok: false, erro: 'token inválido' });

    lock.waitLock(20000);
    var aba = abaDados();
    var indice = indicePorChave(aba);
    var ops = corpo.ops || [];
    var remover = [];

    ops.forEach(function (op) {
      if (op.op === 'remover') {
        if (indice[op.chave]) remover.push(indice[op.chave]);
        return;
      }
      var valores = COLUNAS.map(function (c) { return op[c] === undefined || op[c] === null ? '' : op[c]; });
      if (indice[op.chave]) {
        aba.getRange(indice[op.chave], 1, 1, COLUNAS.length).setValues([valores]);
      } else {
        aba.appendRow(valores);
        indice[op.chave] = aba.getLastRow();
      }
    });

    // Remove de baixo para cima para não deslocar as linhas ainda não apagadas.
    remover.sort(function (a, b) { return b - a; }).forEach(function (linha) { aba.deleteRow(linha); });

    return resposta({ ok: true, recebidas: ops.length });
  } catch (err) {
    return resposta({ ok: false, erro: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function abaDados() {
  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  var aba = planilha.getSheetByName(ABA);
  if (!aba) {
    aba = planilha.insertSheet(ABA);
    aba.getRange(1, 1, 1, COLUNAS.length).setValues([COLUNAS]).setFontWeight('bold');
    aba.setFrozenRows(1);
    // Datas e chaves como texto: o Sheets não deve converter "2026-10-04" em data.
    aba.getRange(1, 1, aba.getMaxRows(), 2).setNumberFormat('@');
  }
  return aba;
}

// chave -> número da linha (a chave é única: data|exercicio|serie).
function indicePorChave(aba) {
  var ultima = aba.getLastRow();
  var mapa = {};
  if (ultima < 2) return mapa;
  var chaves = aba.getRange(2, 1, ultima - 1, 1).getValues();
  for (var i = 0; i < chaves.length; i++) mapa[chaves[i][0]] = i + 2;
  return mapa;
}

function resposta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
