# Guía Técnica: Generación del Ejecutable (.exe) para "My Clippy"

**Asistente de Escritorio en Electron para Windows 10 y 11**  
**Versión del documento:** 1.0.0  
**Fecha:** 28 de octubre de 2026  
**Autor:** Documentación Técnica de Desarrollo  

---

## 1. Introducción y Portada

Este documento describe paso a paso el procedimiento para transformar el código fuente de la aplicación de escritorio **My Clippy** en archivos ejecutables listos para su distribución en sistemas operativos Windows 10 y Windows 11.

El proyecto es un asistente de escritorio flotante (con animación de un gato tecleando) desarrollado con **Electron**, **HTML**, **CSS** y **JavaScript**. El proceso de empaquetado utiliza la herramienta **electron-builder**, la cual ya se encuentra integrada en la configuración del proyecto.

---

## 2. Requisitos Previos

Antes de iniciar la compilación, asegúrate de que tu equipo cumpla con las siguientes condiciones básicas:

### 2.1. Node.js y npm
Se requiere contar con una versión LTS (Long Term Support) de Node.js instalada en el sistema (versión 18, 20 o superior recomendada).

Para comprobar que Node.js y el gestor de paquetes npm están instalados y accesibles en tu sistema, abre PowerShell y ejecuta:

```powershell
node -v
```

*Este comando imprime en pantalla la versión de Node.js instalada (por ejemplo, `v20.11.1`).*

```powershell
npm -v
```

*Este comando muestra la versión del gestor de paquetes npm (por ejemplo, `10.2.4`).*

> [!NOTE]
> Si alguno de los comandos devuelve un mensaje de error que indica que no se reconoce el término, debes descargar e instalar Node.js desde su sitio web oficial (`https://nodejs.org/`) y reiniciar PowerShell.

### 2.2. Consola de PowerShell
El procedimiento está diseñado para **Windows PowerShell 5.1** o **PowerShell 7+**, incluidos por defecto en Windows 10 y Windows 11. No es necesario instalar terminales adicionales.

### 2.3. Espacio en disco
Se recomienda disponer de al menos **2 GB de espacio libre** en el disco duro. Durante la compilación se descargan imágenes del motor Chromium y de Node.js específicas para la versión de Electron seleccionada.

### 2.4. Conexión a Internet
Es indispensable disponer de conexión a Internet durante la **primera compilación**. En este primer proceso, `electron-builder` descarga automáticamente los binarios precompilados de Electron para Windows y las herramientas del empaquetador NSIS. Las compilaciones posteriores se realizan fuera de línea utilizando la caché local.

---

## 3. Preparación del Entorno

Sigue estos pasos para posicionarte en el directorio del proyecto y verificar sus dependencias:

### 3.1. Abrir PowerShell
Presiona la tecla `Windows`, escribe **PowerShell** y haz clic en la aplicación.

### 3.2. Navegar a la carpeta del proyecto
Utiliza el comando `Set-Location` (o su alias habitual `cd`) seguido de la ruta absoluta o relativa de tu carpeta `my-clippy`. Si la ruta contiene espacios, escríbela entre comillas:

```powershell
cd "C:\proyectos\my-clippy"
```

*Este comando cambia el directorio de trabajo activo a la carpeta del proyecto.*

Para confirmar que te encuentras en la carpeta correcta, lista los archivos principales:

```powershell
Get-ChildItem -Name
```

*Deberás observar archivos como `package.json`, `main.js`, `renderer.js` y la carpeta `animations`.*

### 3.3. Instalar o verificar dependencias
Antes de compilar, descarga todas las librerías necesarias ejecutando:

```powershell
npm install
```

*Este comando lee `package.json` y descarga los módulos requeridos en la carpeta `node_modules`.*

### 3.4. Confirmar que electron-builder está presente
Verifica que la herramienta de empaquetado esté instalada correctamente:

```powershell
npm ls electron-builder
```

*El comando mostrará el árbol de dependencias con la versión instalada de `electron-builder` (por ejemplo, `electron-builder@26.18.0`).*

---

## 4. Probar la Aplicación en Modo Desarrollo

Antes de invertir tiempo en empaquetar, es fundamental certificar que el código se ejecuta sin errores en modo interactivo:

```powershell
npm start
```

*Este comando limpia variables de entorno conflictivas y lanza la ventana flotante de My Clippy en tu escritorio.*

Verifica lo siguiente durante la prueba:
- El gato animado aparece visible en la esquina inferior derecha.
- Al hacer clic derecho sobre el gato se despliega el menú contextual con opciones ("Reaccionar a agentes de IA", "Más rápido", "Más lento", "Salir").
- Puedes mover al gato haciendo clic izquierdo y arrastrándolo.

Cierra la aplicación desde la opción **Salir** del menú contextual o presionando `Ctrl + C` en la ventana de PowerShell antes de continuar al siguiente paso.

---

## 5. Generación del Ejecutable

El empaquetado se divide en dos métodos: una prueba rápida sin comprimir y el empaquetado final de distribución.

### 5.1. Prueba rápida (Carpeta desempaquetada)
Si deseas comprobar rápidamente que todos los archivos requeridos están presentes sin esperar la compresión de los instaladores, ejecuta:

```powershell
npm run build:dir
```

*Este comando procesa el código y crea la carpeta `dist\win-unpacked` con los binarios listos para ejecutarse.*

Una vez terminado el proceso, prueba el ejecutable directo desde PowerShell:

```powershell
& ".\dist\win-unpacked\My Clippy.exe"
```

*El operador `&` permite a PowerShell ejecutar aplicaciones cuya ruta o nombre contiene espacios.*

Si el asistente abre y funciona igual que en desarrollo, el empaquetado base es correcto.

### 5.2. Compilación completa (Instalador y Portable)
Para generar los archivos finales listos para compartir o publicar, ejecuta:

```powershell
npm run build
```

*Este comando compila la aplicación, empaqueta los recursos en formato ASAR y genera tanto el instalador interactivo como la versión autónoma portable en la carpeta `dist\`.*

El proceso tardará entre 30 segundos y 2 minutos dependiendo de la velocidad de tu procesador y de si los binarios base ya se encontraban en la caché local.

---

## 6. Estructura y Archivos Generados en la Carpeta `dist\`

Al finalizar `npm run build`, se habrá creado la carpeta `dist\`. Puedes revisar su contenido con el siguiente comando:

```powershell
Get-ChildItem -Path dist\ -Filter "*.exe" | Select-Object Name, Length
```

Encontrarás dos ejecutables con el formato `MyClippy-<versión>-<tipo>.exe`:

```
dist/
├── MyClippy-1.0.0-nsis.exe        <-- Instalador formal de Windows (Setup)
├── MyClippy-1.0.0-portable.exe    <-- Versión autónoma (Portable)
└── win-unpacked/                  <-- Carpeta con binarios sin empaquetar
    └── My Clippy.exe
```

### 6.1. Comparativa: ¿Cuál archivo utilizar?

| Archivo | Tipo | Características | Cuándo usarlo |
| :--- | :--- | :--- | :--- |
| **`MyClippy-1.0.0-nsis.exe`** | **Instalador NSIS** | • Instalación con un solo clic en la cuenta del usuario.<br>• Registra la aplicación en el Menú Inicio y en "Configuración > Aplicaciones".<br>• Permite desinstalación limpia desde el panel de control.<br>• Soporta inicio automático con Windows si está activo. | **Recomendado para distribución final.** Ideal para el usuario que desea instalar la aplicación de forma permanente en su equipo. |
| **`MyClippy-1.0.0-portable.exe`** | **Ejecutable Portable** | • No requiere instalación previa ni privilegios administrativos.<br>• Se ejecuta directamente al hacer doble clic.<br>• Puede ejecutarse desde una memoria USB o disco externo.<br>• No crea accesos directos en el sistema. | **Ideal para pruebas rápidas o equipos compartidos.** Útil si quieres compartir el programa por chat o llevarlo en un pendrive sin modificar el sistema anfitrión. |

---

## 7. Instalación, Ejecución y Desinstalación

### 7.1. Probar el instalador NSIS
Para lanzar la instalación asistida desde PowerShell:

```powershell
Start-Process ".\dist\MyClippy-1.0.0-nsis.exe"
```

El instalador configurará el programa en la ruta del usuario:
`%LOCALAPPDATA%\Programs\My Clippy`

Una vez concluida la instalación, My Clippy se abrirá automáticamente y estará disponible en el menú de búsqueda de Windows.

### 7.2. Probar la versión portable
Para ejecutar directamente la versión portable:

```powershell
Start-Process ".\dist\MyClippy-1.0.0-portable.exe"
```

La aplicación iniciará sin instalar archivos en la carpeta del sistema.

### 7.3. Cómo desinstalar My Clippy
Si instalaste la aplicación mediante el instalador NSIS, puedes removerla de dos maneras:
1. Desde la interfaz gráfica: Abre **Configuración de Windows** > **Aplicaciones** > **Aplicaciones instaladas**, busca **My Clippy** y haz clic en **Desinstalar**.
2. Desde PowerShell, ejecutando su desinstalador nativo:

```powershell
Start-Process "$env:LOCALAPPDATA\Programs\My Clippy\Uninstall My Clippy.exe"
```

> [!NOTE]
> Por configuración del proyecto (`deleteAppDataOnUninstall: false`), tus preferencias guardadas en `config.json` se preservan para que no pierdas tu configuración si decides reinstalar en el futuro.

---

## 8. Personalización de Ícono y Versión

Antes de compilar una nueva versión o entregar el software a otros usuarios, puedes actualizar el número de versión y el ícono de la aplicación.

### 8.1. Cambiar el ícono de la aplicación
1. El archivo del ícono se ubica en: `build\icon.png`.
2. La imagen debe ser un archivo **PNG con fondo transparente** y formato cuadrado:
   - Tamaño mínimo admitido: **256 x 256 píxeles**.
   - Tamaño recomendado: **512 x 512 píxeles**.
3. `electron-builder` convierte automáticamente esta imagen PNG en los formatos `.ico` internos requeridos por Windows para el ejecutable y la barra de tareas.

Para verificar las dimensiones de tu imagen desde PowerShell:

```powershell
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile((Resolve-Path "build\icon.png"))
Write-Output "Dimensiones: $($img.Width) x $($img.Height) px"
$img.Dispose()
```

### 8.2. Actualizar el número de versión
Abre el archivo `package.json` en tu editor de código o modifícalo directamente:

```json
{
  "name": "my-clippy",
  "version": "1.1.0",
  ...
}
```

Al compilar nuevamente, los nombres de los ejecutables se actualizarán de forma automática (por ejemplo: `MyClippy-1.1.0-nsis.exe` y `MyClippy-1.1.0-portable.exe`).

---

## 9. Procedimiento para Recompilar tras Realizar Cambios

Cuando modifiques archivos del proyecto (como animaciones, detector de actividad o estilos), sigue este ciclo limpio para compilar:

### 9.1. Limpiar compilaciones anteriores
Es una buena práctica eliminar la carpeta `dist\` para evitar conflictos con archivos bloqueados o residuos de versiones previas:

```powershell
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
```

*Este comando elimina la carpeta `dist` y todo su contenido de manera forzada sin emitir errores si la carpeta no existe.*

### 9.2. Generar el nuevo build
Ejecuta la compilación de producción:

```powershell
npm run build
```

### 9.3. Abrir la carpeta contenedora en el Explorador
Para visualizar los archivos generados en el explorador gráfico de Windows:

```powershell
explorer.exe dist
```

---

## 10. Solución de Problemas Frecuentes

A continuación se detallan los incidentes más comunes que pueden ocurrir durante el empaquetado o ejecución, junto con su causa y resolución directa:

| Problema | Causa | Solución |
| :--- | :--- | :--- |
| **Error: "Cannot create symbolic link" o error de permisos EPERM** | Windows restringe la creación de enlaces simbólicos a usuarios estándar si el modo desarrollador está inactivo. | **Opción A:** Activa el **Modo de desarrollador** en Windows (*Configuración > Privacidad y seguridad > Para desarrolladores > Modo de desarrollador*).<br>**Opción B:** Abre PowerShell con clic derecho y selecciona **"Ejecutar como administrador"**, y repite el comando `npm run build`. |
| **Error de script deshabilitado al ejecutar npm** (`PSSecurityException` o "la ejecución de scripts está deshabilitada en este sistema") | La política de ejecución de PowerShell bloquea la ejecución de scripts `.ps1` de npm en la cuenta de usuario. | En PowerShell, habilita la ejecución de scripts firmados o locales ejecutando:<br>`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`<br>Presiona `S` (Sí) para confirmar. |
| **Windows SmartScreen muestra "Windows protegió su PC" al abrir el .exe** | El ejecutable no cuenta con un certificado digital de firma de código comercial (Code Signing Certificate). | Es el comportamiento normal para software independiente sin firmar. Haz clic en el enlace **"Más información"** y luego pulsa el botón **"Ejecutar de todas formas"**. |
| **El antivirus de Windows o de terceros bloquea o elimina el ejecutable recién creado** | Falso positivo: los analizadores heurísticos desconfían de ejecutables nuevos creados localmente que contienen motores Chromium. | Agrega la carpeta del proyecto (o la subcarpeta `dist`) a la lista de **exclusiones** de tu antivirus (Windows Defender > Protección contra virus y amenazas > Configuración > Exclusiones). |
| **El ejecutable abre una ventana vacía/blanca o no inicia, pero `npm start` funciona** | Algún archivo crítico (`activity-monitor.js`, `index.html`, etc.) quedó excluido del paquete empaquetado. | 1. Abre PowerShell y lanza el binario directamente para inspeccionar errores en consola:<br>`& ".\dist\win-unpacked\My Clippy.exe"`<br>2. Revisa la sección `"build.files"` en `package.json` y asegúrate de que incluya `"*.js"`, `"activity-monitor.js"`, `"*.html"`, `"*.css"` y `"animations/**/*"`. |
| **Errores de descarga de dependencias (`ETIMEDOUT`, error de red o caché corrupta)** | Interrupción en la descarga de paquetes o archivos cacheados incompletos. | Limpia la caché global de npm y vuelve a descargar las dependencias ejecutando:<br>`npm cache clean --force`<br>`npm install` |
| **El primer build tarda varios minutos en el paso "downloading parts"** | Es el comportamiento normal de la primera ejecución. | Durante el primer build, electron-builder debe descargar aproximadamente 80-120 MB de binarios base de Electron desde GitHub. Ten paciencia; los builds posteriores usarán la caché y tomarán segundos. |

---

## 11. Ubicación de Datos de Configuración y Registros

Cuando My Clippy se ejecuta en modo empaquetado, almacena sus datos de estado y bitácoras de error en el directorio estándar `userData` de Windows para no ensuciar la carpeta de la aplicación:

### 11.1. Ruta de los datos
La ruta estándar es:
`%APPDATA%\My Clippy`  
*(Equivalente a: `C:\Users\<TuUsuario>\AppData\Roaming\My Clippy`)*

En esta carpeta se gestionan:
- **`config.json`**: Guarda la animación activa, el estado de inicio automático con Windows y la casilla *"Reaccionar a agentes de IA"*.
- **`logs\error.log`**: Registra fallos no controlados si ocurren durante la ejecución.
- **`animations\`**: Carpeta de animaciones externas opcionales.

### 11.2. Abrir la carpeta desde PowerShell
Puedes acceder instantáneamente a esta carpeta desde PowerShell ejecutando:

```powershell
explorer "$env:APPDATA\My Clippy"
```

*Si la carpeta aún no ha sido creada porque no has iniciado la aplicación por primera vez, puedes abrir el directorio raíz con `explorer $env:APPDATA`.*

Para consultar el registro de errores directamente desde PowerShell:

```powershell
Get-Content "$env:APPDATA\My Clippy\logs\error.log" -Tail 20 -ErrorAction SilentlyContinue
```

---

## 12. Lista de Verificación Final (Checklist de Publicación)

Antes de compartir los archivos `.exe` generados con otros usuarios, valida los siguientes puntos:

- [ ] **1. Prueba en desarrollo satisfactoria:** `npm start` arranca sin advertencias ni errores en la consola.
- [ ] **2. Número de versión actualizado:** El campo `"version"` en `package.json` refleja el número que deseas entregar (por ejemplo, `1.0.0`).
- [ ] **3. Ícono verificado:** El archivo `build\icon.png` existe, es legible y tiene dimensiones de al menos 256x256 px.
- [ ] **4. Archivos incluidos en el build:** La lista `"files"` de `package.json` incluye `activity-monitor.js` y todos los recursos necesarios.
- [ ] **5. Limpieza previa:** Se eliminó la carpeta `dist\` anterior antes de lanzar la compilación definitiva.
- [ ] **6. Generación sin advertencias críticas:** `npm run build` finalizó con código de salida 0.
- [ ] **7. Prueba de la versión Portable:** Se abrió `dist\MyClippy-<versión>-portable.exe`, la animación del gato funciona y responde al menú contextual.
- [ ] **8. Prueba del Instalador NSIS:** Se ejecutó `dist\MyClippy-<versión>-nsis.exe`, se comprobó la instalación correcta en el sistema y se verificó que la aplicación responde a las opciones de velocidad.
- [ ] **9. Prueba de desinstalación limpia:** Se validó que el desinstalador remueve la aplicación correctamente del Menú Inicio.
- [ ] **10. Empaquetado final para envío:** Si vas a distribuir por correo o mensajería, comprime el instalador o el portable en un archivo `.zip` para evitar bloqueos por filtros de ejecutables.

---

> [!TIP]
> **Listo para exportar a PDF:**  
> Puedes abrir este documento en cualquier visor Markdown o navegador web (mediante la vista de vista previa de tu editor) y pulsar `Ctrl + P` para guardarlo directamente como un documento PDF formal, conservando el diseño, tablas y bloques de código listos para copiar.


