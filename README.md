# ✨ Borrachos.docx - Tablero de Ideas

## 📋 Descripción

**Borrachos.docx** es una aplicación web minimalista para organizar y gestionar ideas personales y grupales. Permite crear, categorizar y visualizar ideas en un tablero tipo Kanban con dos estados: **En Progreso** y **Pausado**.

La aplicación incluye funcionalidad de **compartir tableros grupales** de forma segura mediante encriptación AES-256, permitiendo colaboración protegida por contraseña.

---

## 🎨 Características

- **📊 Tablero Kanban**: Visualiza ideas en dos columnas (En Progreso / Pausado)
- **🏷️ Categorías**: Organiza ideas en Personal, Trabajo, Diversión y Grupales
- **🌓 Tema Claro/Oscuro**: Alterna entre modo oscuro y claro
- **🖼️ Imágenes**: Adjunta imágenes a tus ideas
- **🔒 Compartir Seguro**: Exporta ideas grupales encriptadas con contraseña
- **💾 Persistencia**: Guarda automáticamente en localStorage
- **🔐 Sesiones Protegidas**: Los tableros compartidos se guardan encriptados

---

## 📁 Estructura de archivos

```
Patata/
│
├── index.html          # Página principal de la aplicación
├── app.js              # Lógica principal, gestión de estado y encriptación
├── script.js           # Script auxiliar (legacy)
├── style.css           # Estilos CSS con variables de tema
└── README.md           # Este archivo
```

---

## 🚀 Uso

### Abrir la aplicación
Simplemente abre `index.html` en tu navegador web moderno.

### Crear una idea
1. Haz clic en **"+ Nueva Idea"**
2. Completa el formulario:
   - Nombre de la idea
   - Descripción
   - Categoría (Personal, Trabajo, Diversión, Grupales)
   - Estado inicial (En Progreso / Pausado)
   - Imagen opcional
3. Haz clic en **"Guardar Idea"**

### Gestionar ideas
- **Editar**: Haz clic en el ícono ✏️
- **Eliminar**: Haz clic en el ícono 🗑️
- **Cambiar estado**: Haz clic en el ícono ⇄

### Filtrar por categoría
Usa la barra lateral izquierda para filtrar ideas por categoría.

### Compartir tablero grupal
1. Crea ideas en la categoría **"Grupales"**
2. Haz clic en **"📤 Compartir"**
3. Establece una contraseña
4. Se descargará un archivo `.lock` encriptado

### Abrir tablero compartido
1. Haz clic en **"📂 Abrir"**
2. Selecciona el archivo `.lock`
3. Introduce la contraseña
4. El tablero se cargará y guardará de forma encriptada

---

## 🔐 Seguridad

- **Encriptación**: AES-256-GCM con PBKDF2 (100,000 iteraciones)
- **Solo Grupales**: Solo se comparten ideas de la categoría "Grupales"
- **Persistencia Segura**: Los tableros compartidos se guardan encriptados en localStorage
- **Protección por Contraseña**: Cada sesión compartida requiere contraseña al recargar

---

## 🎨 Temas

La aplicación soporta dos temas:

- **🌙 Modo Oscuro** (por defecto): Fondo oscuro con acentos en verde eléctrico (#00FF3C)
- **☀️ Modo Claro**: Fondo verde claro con superficie verde brillante (#70FF99)

---

## 💾 Almacenamiento

- **localStorage**: Todas las ideas se guardan automáticamente
- **Sesiones Normales**: Datos sin encriptar
- **Sesiones Compartidas**: Datos encriptados con la contraseña de sesión

---

## 🛠️ Tecnologías

- HTML5
- CSS3 (Variables CSS, Flexbox, Grid)
- JavaScript (ES6+)
- Web Crypto API (encriptación)
- localStorage API

---

## 📝 Notas

- Las ideas personales, de trabajo y diversión **NO** se comparten al exportar
- Solo las ideas marcadas como **"Grupales"** se incluyen en el archivo `.lock`
- Los cambios en sesiones compartidas se guardan de forma encriptada
- La contraseña no se almacena, solo se mantiene en memoria durante la sesión

---

## 👤 Autor

**Demi1Codex** - Espacio personal de ideas y pensamientos