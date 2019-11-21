// Constantes

var HOJA_AJUSTES = 'Control';
var FORM_ACTIVO = 'B3';
var TITULO = 'B5';
var COLOR_TEMA = 'F5';
var H_TITULO = 'H5';
var URL_LOGO = 'B7';
var URL_CARPETA = 'B10';
var ID_CARPETA = 'B11';
var INSTRUCCIONES = 'B13';
var CONSENTIMIENTO_ACTIVO = 'B15';
var CONSENTIMIENTO = 'B17';
var NOTIFICAR_ACTIVO = 'B19';
var NOMBRE_EMAIL = 'B21'
var ASUNTO_EMAIL = 'B23';
var TEXTO_PERSONALIZADO = 'B25';
var DESTINATARIOS = 'B27';
var NOMBRE_APP = 'RecogeCV';

var HOJA_CV = 'CV';
var FIL_CV = 3;
var COL_FECHA = 1;
var COL_NOMBRE = 2;
var COL_APELLIDOS = 3;
var COL_DNI = 4;
var COL_EMAIL = 5;
var COL_TEL = 6;
var COL_URL = 7;
var COL_OK = 8;

function onOpen() {
  
  SpreadsheetApp.getUi().createMenu('📥 RecogeCV')
    .addItem('Acerca de RecogeCV', 'acercaDe')
    .addToUi();
  
}

function acercaDe() {

  // Presentación del complemento
  var panel = HtmlService.createHtmlOutputFromFile('acercaDe')
    .setWidth(420)
    .setHeight(220)
  SpreadsheetApp.getUi().showModalDialog(panel, '💡 ¿Qué es RecogeCV?');
  
}


// Generar formulario web

function doGet(e) {

  var hdc = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_AJUSTES);
  var formularioWeb = HtmlService.createTemplateFromFile('formularioWeb');
  
  // Rellenar elementos de plantilla
  
  formularioWeb.titulo = hdc.getRange(TITULO).getValue();
  formularioWeb.htitulo = hdc.getRange(H_TITULO).getValue();
  formularioWeb.urlImgLogo = hdc.getRange(URL_LOGO).getValue();
  formularioWeb.instrucciones = hdc.getRange(INSTRUCCIONES).getValue();   
  formularioWeb.consentimiento = hdc.getRange(CONSENTIMIENTO).getValue();
  
  return formularioWeb.evaluate().setTitle(hdc.getRange(TITULO).getValue());
    
}

// Recibir datos del formulario

function enviarFormulario(e) {

  // ¡Aunque no se devuelva nada con return, si se ha producido
  // un error puede cazarse en el lado JS con .withFailureHandler(function(valor){})!
    
  // Todo dentro de un bloque try / catch para cazar y mostrar errores
  
  try {
    
    var hdc = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_CV);
    
    // Si hay candidatura en fila de respuestas (se comprueba fecha), insertar una nueva
    // Arriba siempre los envíos más recientes
    
    if (hdc.getRange(FIL_CV, COL_FECHA).getValue() != '') {
    
      hdc.insertRowBefore(FIL_CV);   
      
    }
    
    hdc.getRange(FIL_CV, COL_FECHA).setValue(new Date()).setNumberFormat('dd/mm/yy HH:mm');
    hdc.getRange(FIL_CV, COL_NOMBRE).setValue(e.nombre);
    hdc.getRange(FIL_CV, COL_APELLIDOS).setValue(e.apellidos);
    hdc.getRange(FIL_CV, COL_DNI).setValue(e.dni);
    hdc.getRange(FIL_CV, COL_EMAIL).setValue(e.email);
    hdc.getRange(FIL_CV, COL_TEL).setValue(e.telefono);
    
    // Mostrar estado del checkbox y ajustar validación de datos de la celda para que aparezca [X]/[]
    
    hdc.getRange(FIL_CV, COL_OK).setValue(e.ok == 'on' ? true : false);
    hdc.getRange(FIL_CV, COL_OK).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox());
    
    // Copiar archivo en carpeta de Drive y generar URL
    // e.cv.getContenType solo se fija en la extensión, por tanto no es un método válido
    // para determinar si realmente se trata de un PDF. Habría que convertir el blob a binario y
    // comprobar si los 4 primeros bytes son 25 50 44 46 (ASCII %PDF-1.3), pero no creo que
    // merezca la pena complicarse tanto la vida
    // https://www.filesignatures.net/index.php?page=search&search=PDF&mode=EXT
        
    // Crea archivo en carpeta destino en Drive, si no se ha especificado se utiliza la de la hoja de cálculo
     
    var carpetaDestino =  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_AJUSTES).getRange(ID_CARPETA).getValue();
    
    if (carpetaDestino == '') {
    
      carpetaDestino = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId()).getParents().next();
    
    }
    else {
    
      carpetaDestino = DriveApp.getFolderById(carpetaDestino);
    
    } 
    
    var archivo = carpetaDestino.createFile(e.cv);
    var archivoNombre = e.apellidos + ' ' + e.nombre + ' # ' + e.cv.getName();
    archivo.setName(archivoNombre);
    
    // Construir fórmula con hiperenlace a URL archivo adjunto (texto = apellidos + nombre + dni + nombre_fichero)
    
    hdc.getRange(FIL_CV, COL_URL).setFormula('=HYPERLINK("' + archivo.getUrl() + '";"' + archivoNombre + '")');
    
    // Enviar notificaciones por email a gestiones de candidaturas, si procede
    
    var notificar = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_AJUSTES).getRange(NOTIFICAR_ACTIVO).getValue();
    
    if (notificar == true) {
    
      var errorEmail = enviarEmail({nombre: e.nombre,
                     apellidos: e.apellidos,
                     dni: e.dni,
                     email: e.email,
                     telefono: e.telefono,
                     consentimiento: e.ok == 'on' ? 'Exigida y aceptada' : 'No exigida',
                     archivoNombre: archivoNombre,
                     archivoURL: archivo.getUrl(),
                     carpetaNombre: carpetaDestino.getName(),
                     carpetaURL: SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_AJUSTES).getRange(URL_CARPETA).getValue()
                    });                      
    }
    
    if (errorEmail) {
    
      // Salir devolviendo a cliente posible error al enviar email
      
      return errorEmail;
    
    }
    else {
      
      // Devolver resultado a formulario web
          
      return '✅ Datos enviados';
      
    } 
  } 
  catch (e) {
  
    return '❌ Error: ' + e;
  
  }
}

// Envía por email notificación correspondiente a
// candidatura {nombre, apellidos, dni, email, telefono, consentimiento, archivoNombre, archivoURL, carpetaNombre, carpetaURL}

function enviarEmail(candidatura) {

  try {

    var hdc = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_AJUSTES);
    var asunto = hdc.getRange(ASUNTO_EMAIL).getValue();
    var destinatarios = hdc.getRange(DESTINATARIOS).getValue();
    var remitenteNombre = '[' + NOMBRE_APP + '] ' + hdc.getRange(NOMBRE_EMAIL).getValue();
    
    // Construimos plantilla de mensaje HTML
    
    var plantillaHtml = HtmlService.createTemplateFromFile('plantillaEmail');
    
    // Valores de scriptlets
    
    plantillaHtml.urlImgLogo =hdc.getRange(URL_LOGO).getValue();
    plantillaHtml.textoPersonalizado = hdc.getRange(TEXTO_PERSONALIZADO).getValue();
    plantillaHtml.titulo =hdc.getRange(TITULO).getValue();
    plantillaHtml.candidato = candidatura.nombre + ' ' + candidatura.apellidos;
    plantillaHtml.instrucciones =hdc.getRange(INSTRUCCIONES).getValue();
    plantillaHtml.dni = candidatura.dni;
    plantillaHtml.email = candidatura.email;
    plantillaHtml.telefono = candidatura.telefono;
    plantillaHtml.archivoURL = candidatura.archivoURL;
    plantillaHtml.ok = candidatura.consentimiento;
    plantillaHtml.archivoNombre = candidatura.archivoNombre;
    plantillaHtml.carpetaURL = candidatura.carpetaURL;
    plantillaHtml.carpetaNombre = candidatura.carpetaNombre;
    plantillaHtml.hdcURL = SpreadsheetApp.getActiveSpreadsheet().getUrl();
    plantillaHtml.hdcNombre = SpreadsheetApp.getActiveSpreadsheet().getName();

    // Crear documento HTML con resultados vía scriptlets
    
    var mensajeHTML = plantillaHtml.evaluate().setTitle(asunto);
    
    // Enviar email(s)
    
    MailApp.sendEmail(destinatarios,
                      asunto,'Necesitas un cliente de correo capaz de mostrar HTML.',
                      {name: remitenteNombre, htmlBody:mensajeHTML.getContent()});
                      
  }
  
  catch (e) {
      
   return '❌ Error: ' + e;
  
  }
}