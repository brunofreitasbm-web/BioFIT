/**
 * Recebe as séries do app Treino e grava na aba "Registro" (uma linha por série).
 *
 * Instalação: veja README.md nesta pasta.
 * O token fica em Configurações do projeto → Propriedades do script → TOKEN (não no código).
 *
 * Colunas da aba (linha 5 em diante): A Data · B Sessão · C Rodada · D Exercício · E Série ·
 * F Carga · G Reps · H RIR · I e1RM · J Obs.
 * A linha de uma série é achada por Data + Exercício + Série, então editar no app atualiza a
 * linha em vez de duplicar. A coluna I só é escrita se não tiver fórmula.
 */
var ABA = 'Registro';
var PRIMEIRA_LINHA = 5;

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var corpo = JSON.parse(e.postData.contents);
    var token = PropertiesService.getScriptProperties().getProperty('TOKEN');
    if (!token || corpo.token !== token) return resposta({ ok: false, erro: 'token inválido' });

    lock.waitLock(20000);
    var aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA);
    if (!aba) return resposta({ ok: false, erro: 'aba "' + ABA + '" não encontrada' });

    var ops = corpo.ops || [];
    var estado = lerEstado(aba);
    ops.forEach(function (op) {
      var chave = op.data + '|' + op.exercicio + '|' + op.serie;
      if (op.op === 'remover') {
        if (estado.porChave[chave]) {
          limpar(aba, estado.porChave[chave], estado);
          delete estado.porChave[chave];
        }
        return;
      }
      var linha = estado.porChave[chave] || proximaLivre(estado);
      escrever(aba, linha, op);
      estado.porChave[chave] = linha;
      estado.ocupadas[linha] = true;
    });

    return resposta({ ok: true, recebidas: ops.length });
  } catch (err) {
    return resposta({ ok: false, erro: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

// Mapeia as linhas já preenchidas. Linhas-exemplo ("(apagar)") contam como livres.
function lerEstado(aba) {
  var total = aba.getMaxRows();
  var n = total - PRIMEIRA_LINHA + 1;
  var porChave = {}, ocupadas = {};
  if (n > 0) {
    var tz = aba.getParent().getSpreadsheetTimeZone();
    var v = aba.getRange(PRIMEIRA_LINHA, 1, n, 5).getValues();
    for (var i = 0; i < v.length; i++) {
      var nome = String(v[i][3]);
      if (!v[i][0] && !nome) continue;
      if (nome.indexOf('(apagar)') >= 0) continue;
      var linha = i + PRIMEIRA_LINHA;
      // O Sheets pode ter convertido "2026-10-05" em data: normaliza de volta para texto.
      var data = v[i][0] instanceof Date ? Utilities.formatDate(v[i][0], tz, 'yyyy-MM-dd') : String(v[i][0]);
      ocupadas[linha] = true;
      porChave[data + '|' + nome + '|' + v[i][4]] = linha;
    }
  }
  return { porChave: porChave, ocupadas: ocupadas, total: total };
}

function proximaLivre(estado) {
  for (var l = PRIMEIRA_LINHA; l <= estado.total; l++) if (!estado.ocupadas[l]) return l;
  return estado.total + 1; // acabaram as linhas formatadas: o Sheets estende a aba
}

function escrever(aba, linha, op) {
  function v(x) { return x === undefined || x === null ? '' : x; }
  aba.getRange(linha, 1, 1, 8).setValues([[op.data, op.sessao, v(op.rodada), op.exercicio, op.serie, v(op.cargaKg), v(op.reps), v(op.rir)]]);
  aba.getRange(linha, 10).setValue(v(op.observacoes));
  var celE1rm = aba.getRange(linha, 9);
  if (!celE1rm.getFormula()) {
    celE1rm.setValue(op.cargaKg && op.reps ? Math.round(op.cargaKg * (1 + op.reps / 30) * 10) / 10 : '');
  }
}

function limpar(aba, linha, estado) {
  aba.getRange(linha, 1, 1, 8).clearContent();
  aba.getRange(linha, 10).clearContent();
  var cel = aba.getRange(linha, 9);
  if (!cel.getFormula()) cel.clearContent();
  delete estado.ocupadas[linha];
}

function resposta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
