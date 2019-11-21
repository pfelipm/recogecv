/**
 * Gets the user's OAuth 2.0 access token so that it can be passed to Picker.
 * This technique keeps Picker from needing to show its own authorization
 * dialog, but is only possible if the OAuth scope that Picker needs is
 * available in Apps Script. In this case, the function includes an unused call
 * to a DriveApp method to ensure that Apps Script requests access to all files
 * in the user's Drive.
 *
 * @return {string} The user's OAuth 2.0 access token.
 */
function getOAuthToken() {

  DriveApp.getRootFolder();
  
  return ScriptApp.getOAuthToken();
}

// Crea panel modal para desplegar el selector de carpetas

function seleccionarCarpeta() {

  var panel = HtmlService.createTemplateFromFile('panelCarpeta')
    .evaluate()
    .setWidth(710)
    .setHeight(610);
  SpreadsheetApp.getUi().showModalDialog(panel,'Seleccionar carpeta destino para CV');

}

// Recibe información de la carpeta seleccionada por el usuario

function recibirCarpeta(carpeta) {

  SpreadsheetApp.getActiveSheet().getRange(URL_CARPETA).setValue(carpeta);

}