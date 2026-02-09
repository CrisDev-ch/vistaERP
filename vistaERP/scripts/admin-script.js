// Configuración de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    getDoc,
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    setDoc,
    query, 
    orderBy, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCGVaOk-w2Hq3ZFTaoQMWav8Z93-JXcSlw",
    authDomain: "vistaerp-dc6cd.firebaseapp.com",
    projectId: "vistaerp-dc6cd",
    storageBucket: "vistaerp-dc6cd.firebasestorage.app",
    messagingSenderId: "553312601355",
    appId: "1:553312601355:web:5ac96bcf8c019720a8ce0e"

};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Variables globales
let productos = [];
let categorias = [];
let publicaciones = [];
let editandoProducto = false;
let editandoCategoria = false;
let editandoPublicacion = false;

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', function() {
    const usuarioAutenticado = localStorage.getItem('adminAutenticado');
    
    if (usuarioAutenticado === 'true') {
        mostrarPanelAdmin();
    } else {
        mostrarLogin();
    }
    
    configurarEventListeners();
});

// Configurar event listeners
function configurarEventListeners() {
    // Login
    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', manejarLogin);
    
    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn.addEventListener('click', manejarLogout);
    
    // Botón volver al sitio
    const volverBtn = document.getElementById('volver-sitio-btn');
    if (volverBtn) {
        volverBtn.addEventListener('click', function() {
            window.location.href = 'index.html';
        });
    }
    
    // Navegación
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const section = this.getAttribute('data-section');
            cambiarSeccion(section);
            
            navBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Productos
    document.getElementById('add-producto-btn').addEventListener('click', mostrarFormProducto);
    document.getElementById('cancel-producto-btn').addEventListener('click', ocultarFormProducto);
    document.getElementById('producto-form').addEventListener('submit', guardarProducto);
    document.getElementById('producto-imagen-url').addEventListener('input', function() {
        previsualizarImagenURL(this.value, 'producto-imagen-url-preview');
    });
    
    // Categorías
    document.getElementById('add-categoria-btn').addEventListener('click', mostrarFormCategoria);
    document.getElementById('cancel-categoria-btn').addEventListener('click', ocultarFormCategoria);
    document.getElementById('categoria-form').addEventListener('submit', guardarCategoria);
    
    // Publicaciones
    document.getElementById('add-publicacion-btn').addEventListener('click', mostrarFormPublicacion);
    document.getElementById('cancel-publicacion-btn').addEventListener('click', ocultarFormPublicacion);
    document.getElementById('publicacion-form').addEventListener('submit', guardarPublicacion);
    document.getElementById('publicacion-imagen-url').addEventListener('input', function() {
        previsualizarImagenURL(this.value, 'publicacion-imagen-url-preview');
    });
}

// Función para formatear precio en Peso Chileno (para el admin también)
function formatearPrecioCLP(precio) {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(precio);
}

// CORREGIDO: Función de login simplificada y funcional
async function manejarLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('login-error');
    
    // Limpiar mensaje de error previo
    errorMsg.style.display = 'none';
    
    console.log('🔐 Intentando login con:', username);
    
    try {
        // Modo PRUEBA local (sin Firebase Auth)
        if (username === 'Prueba' && password === 'Prueba26') {
            console.log('🔎 Login modo PRUEBA (solo visualización)');
            localStorage.setItem('adminAutenticado', 'true');
            localStorage.setItem('adminRole', 'viewer');
            mostrarPanelAdmin();
            return;
        }

        // Primero intentar login vía Firebase Auth (correo/clave)
        try {
            const userCredential = await signInWithEmailAndPassword(auth, username, password);
            console.log('✅ Firebase Auth login exitoso:', userCredential.user && userCredential.user.email);
            localStorage.setItem('adminAutenticado', 'true');
            localStorage.setItem('adminRole', 'admin');
            mostrarPanelAdmin();
            return;
        } catch (authErr) {
            console.log('⚠️ Firebase Auth falló o no existe usuario:', authErr.code || authErr.message);
            // Continua con el fallback a documento en Firestore
        }

        // Fallback: Verificar si existe el documento de credenciales
        const credencialesRef = doc(db, 'admin', 'credenciales');
        const credencialesDoc = await getDoc(credencialesRef);

        if (credencialesDoc.exists()) {
            const credenciales = credencialesDoc.data();
            console.log('📄 Credenciales encontradas en Firestore');

            // Verificación directa y simple
            if (username === credenciales.usuario && password === credenciales.clave) {
                console.log('✅ Login exitoso (Firestore)');
                localStorage.setItem('adminAutenticado', 'true');
                localStorage.setItem('adminRole', 'admin');
                mostrarPanelAdmin();
            } else {
                console.log('❌ Credenciales incorrectas (Firestore)');
                errorMsg.textContent = 'Usuario o contraseña incorrectos';
                errorMsg.style.display = 'block';
            }
        } else {
            // Si no existe el documento, crear uno por defecto
            console.log('📝 No se encontraron credenciales en Firestore. No se crean por defecto en esta versión.');
            errorMsg.innerHTML = 'No hay credenciales administradoras configuradas en Firestore. Use Firebase Auth o configure credenciales.';
            errorMsg.style.display = 'block';
        }
    } catch (error) {
        console.error("❌ Error en login:", error);
        errorMsg.textContent = 'Error de conexión: ' + error.message;
        errorMsg.style.display = 'block';
    }
}

// Manejar logout
function manejarLogout() {
    localStorage.removeItem('adminAutenticado');
    localStorage.removeItem('adminRole');
    mostrarLogin();
}

// Mostrar panel de administración
function mostrarPanelAdmin() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    
    cargarCategorias();
    cargarProductos();
    cargarPublicaciones();
}

// Mostrar formulario de login
function mostrarLogin() {
    document.getElementById('login-container').style.display = 'flex';
    document.getElementById('admin-panel').style.display = 'none';
    
    document.getElementById('login-form').reset();
    document.getElementById('login-error').style.display = 'none';
}

// Cambiar sección en el panel de admin
function cambiarSeccion(section) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(sec => sec.classList.remove('active'));
    
    document.getElementById(`${section}-section`).classList.add('active');
    
    if (section === 'productos') {
        cargarProductos();
    } else if (section === 'categorias') {
        cargarCategorias();
    } else if (section === 'publicaciones') {
        cargarPublicaciones();
    }
}

// ========== GESTIÓN DE PRODUCTOS ==========

// Mostrar formulario de producto
function mostrarFormProducto() {
    // Solo permitir si es admin (o modo Prueba no tiene permiso para modificar)
    const role = localStorage.getItem('adminRole') || null;
    if (role !== 'admin') {
        alert('No tienes permisos para agregar o editar productos. Inicia sesión con una cuenta administrativa.');
        return;
    }

    document.getElementById('producto-form-container').style.display = 'block';
    document.getElementById('producto-form-title').textContent = 'Agregar Nuevo Producto';
    document.getElementById('producto-form').reset();
    document.getElementById('producto-imagen-url-preview').innerHTML = '';
    editandoProducto = false;
    
    const categoriaSelect = document.getElementById('producto-categoria');
    categoriaSelect.innerHTML = '<option value="">Seleccione una categoría</option>';
    
    categorias.forEach(categoria => {
        const option = document.createElement('option');
        option.value = categoria.nombre;
        option.textContent = categoria.nombre;
        categoriaSelect.appendChild(option);
    });
}

// Ocultar formulario de producto
function ocultarFormProducto() {
    document.getElementById('producto-form-container').style.display = 'none';
    editandoProducto = false;
}

// Guardar producto
async function guardarProducto(e) {
    e.preventDefault();
    
    const productoId = document.getElementById('producto-id').value;
    const nombre = document.getElementById('producto-nombre').value;
    const descripcion = document.getElementById('producto-descripcion').value;
    const precio = document.getElementById('producto-precio').value;
    const categoria = document.getElementById('producto-categoria').value;
    const imagenUrl = document.getElementById('producto-imagen-url').value;
    
    if (!nombre || !descripcion || !precio || !categoria) {
        alert('Por favor, complete todos los campos obligatorios');
        return;
    }
    
    const productoData = {
        nombre,
        descripcion,
        precio: parseFloat(precio),
        categoria,
        imagenUrl: imagenUrl || 'https://via.placeholder.com/300x200?text=Sin+imagen',
        fechaActualizacion: serverTimestamp()
    };
    
    try {
        const role = localStorage.getItem('adminRole') || null;
        if (role !== 'admin') {
            alert('No tienes permisos para guardar productos. Inicia sesión con una cuenta administrativa.');
            return;
        }

        if (editandoProducto) {
            await updateDoc(doc(db, 'productos', productoId), productoData);
            alert('✅ Producto actualizado correctamente');
        } else {
            await addDoc(collection(db, 'productos'), {
                ...productoData,
                fechaCreacion: serverTimestamp()
            });
            alert('✅ Producto agregado correctamente');
        }
        
        ocultarFormProducto();
        cargarProductos();
    } catch (error) {
        console.error("Error al guardar producto: ", error);
        alert('❌ Error al guardar el producto: ' + error.message);
    }
}

// Cargar productos
async function cargarProductos() {
    try {
        const q = query(collection(db, 'productos'), orderBy('fechaActualizacion', 'desc'));
        const querySnapshot = await getDocs(q);
        
        productos = [];
        querySnapshot.forEach((doc) => {
            productos.push({
                id: doc.id,
                ...doc.data()
            });
        });
        mostrarProductosEnTabla();
    } catch (error) {
        console.error("Error al cargar productos: ", error);
        document.getElementById('productos-tbody').innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <p>Error al cargar los productos</p>
                    <small>${error.message}</small>
                </td>
            </tr>
        `;
    }
}

// Mostrar productos en la tabla
function mostrarProductosEnTabla() {
    const tbody = document.getElementById('productos-tbody');
    
    if (productos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <p>No hay productos registrados</p>
                    <small>Haz clic en "Agregar Producto" para comenzar</small>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = '';
    
    productos.forEach(producto => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>
                <img src="${producto.imagenUrl || 'https://via.placeholder.com/50x50?text=Sin+img'}" 
                     alt="${producto.nombre}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
            </td>
            <td>${producto.nombre}</td>
            <td>${producto.descripcion.substring(0, 50)}${producto.descripcion.length > 50 ? '...' : ''}</td>
            <td>${formatearPrecioCLP(producto.precio)}</td>
            <td>${producto.categoria}</td>
            <td>
                <button class="btn-edit" data-id="${producto.id}">Editar</button>
                <button class="btn-delete" data-id="${producto.id}">Eliminar</button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    document.querySelectorAll('.btn-edit[data-id]').forEach(btn => {
        btn.addEventListener('click', function() {
            const productoId = this.getAttribute('data-id');
            editarProducto(productoId);
        });
    });
    
    document.querySelectorAll('.btn-delete[data-id]').forEach(btn => {
        btn.addEventListener('click', function() {
            const productoId = this.getAttribute('data-id');
            eliminarProducto(productoId);
        });
    });
}

// Editar producto
function editarProducto(productoId) {
    const producto = productos.find(p => p.id === productoId);
    
    if (!producto) return;
    
    document.getElementById('producto-id').value = producto.id;
    document.getElementById('producto-nombre').value = producto.nombre;
    document.getElementById('producto-descripcion').value = producto.descripcion;
    document.getElementById('producto-precio').value = producto.precio;
    document.getElementById('producto-imagen-url').value = producto.imagenUrl || '';
    
    const categoriaSelect = document.getElementById('producto-categoria');
    categoriaSelect.innerHTML = '<option value="">Seleccione una categoría</option>';
    
    categorias.forEach(categoria => {
        const option = document.createElement('option');
        option.value = categoria.nombre;
        option.textContent = categoria.nombre;
        if (categoria.nombre === producto.categoria) {
            option.selected = true;
        }
        categoriaSelect.appendChild(option);
    });
    
    previsualizarImagenURL(producto.imagenUrl, 'producto-imagen-url-preview');
    
    document.getElementById('producto-form-container').style.display = 'block';
    document.getElementById('producto-form-title').textContent = 'Editar Producto';
    editandoProducto = true;
}

// Eliminar producto
async function eliminarProducto(productoId) {
    if (confirm('¿Está seguro de que desea eliminar este producto?')) {
        try {
            const role = localStorage.getItem('adminRole') || null;
            if (role !== 'admin') { alert('No tienes permisos para eliminar productos.'); return; }
            await deleteDoc(doc(db, 'productos', productoId));
            alert('✅ Producto eliminado correctamente');
            cargarProductos();
            localStorage.setItem('categoriasActualizadas', Date.now().toString());
        } catch (error) {
            console.error("Error al eliminar producto: ", error);
            alert('❌ Error al eliminar el producto: ' + error.message);
        }
    }
}

// ========== GESTIÓN DE CATEGORÍAS ==========

// Mostrar formulario de categoría
function mostrarFormCategoria() {
    const role = localStorage.getItem('adminRole') || null;
    if (role !== 'admin') {
        alert('No tienes permisos para agregar o editar categorías. Inicia sesión con una cuenta administrativa.');
        return;
    }

    document.getElementById('categoria-form-container').style.display = 'block';
    document.getElementById('categoria-form-title').textContent = 'Agregar Nueva Categoría';
    document.getElementById('categoria-form').reset();
    editandoCategoria = false;
}

// Ocultar formulario de categoría
function ocultarFormCategoria() {
    document.getElementById('categoria-form-container').style.display = 'none';
    editandoCategoria = false;
}

// Guardar categoría
async function guardarCategoria(e) {
    e.preventDefault();
    
    const categoriaId = document.getElementById('categoria-id').value;
    const nombre = document.getElementById('categoria-nombre').value;
    const descripcion = document.getElementById('categoria-descripcion').value;
    
    if (!nombre || !descripcion) {
        alert('Por favor, complete todos los campos');
        return;
    }
    
    const categoriaData = {
        nombre,
        descripcion,
        fechaActualizacion: serverTimestamp()
    };
    
    try {
        const role = localStorage.getItem('adminRole') || null;
        if (role !== 'admin') {
            alert('No tienes permisos para guardar categorías. Inicia sesión con una cuenta administrativa.');
            return;
        }

        if (editandoCategoria) {
            await updateDoc(doc(db, 'categorias', categoriaId), categoriaData);
            alert('✅ Categoría actualizada correctamente');
        } else {
            await addDoc(collection(db, 'categorias'), {
                ...categoriaData,
                fechaCreacion: serverTimestamp()
            });
            alert('✅ Categoría agregada correctamente');
        }
        
        ocultarFormCategoria();
        await cargarCategorias();
        
        // Notificar al frontend que las categorías fueron actualizadas
        if (window.parent && window.parent.actualizarCategoriasFrontend) {
            window.parent.actualizarCategoriasFrontend();
        }
        
        localStorage.setItem('categoriasActualizadas', Date.now().toString());
        
    } catch (error) {
        console.error("Error al guardar categoría: ", error);
        alert('❌ Error al guardar la categoría: ' + error.message);
    }
}

// Cargar categorías
async function cargarCategorias() {
    try {
        const q = query(collection(db, 'categorias'), orderBy('fechaActualizacion', 'desc'));
        const querySnapshot = await getDocs(q);
        
        categorias = [];
        querySnapshot.forEach((doc) => {
            categorias.push({
                id: doc.id,
                ...doc.data()
            });
        });
        mostrarCategoriasEnTabla();
    } catch (error) {
        console.error("Error al cargar categorías: ", error);
        document.getElementById('categorias-tbody').innerHTML = `
            <tr>
                <td colspan="3" class="empty-state">
                    <p>Error al cargar las categorías</p>
                    <small>${error.message}</small>
                </td>
            </tr>
        `;
    }
}

// Mostrar categorías en la tabla
function mostrarCategoriasEnTabla() {
    const tbody = document.getElementById('categorias-tbody');
    
    if (categorias.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="empty-state">
                    <p>No hay categorías registradas</p>
                    <small>Haz clic en "Agregar Categoría" para comenzar</small>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = '';
    
    categorias.forEach(categoria => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>${categoria.nombre}</td>
            <td>${categoria.descripcion}</td>
            <td>
                <button class="btn-edit" data-id="${categoria.id}">Editar</button>
                <button class="btn-delete" data-id="${categoria.id}">Eliminar</button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    document.querySelectorAll('.btn-edit[data-id]').forEach(btn => {
        btn.addEventListener('click', function() {
            const categoriaId = this.getAttribute('data-id');
            editarCategoria(categoriaId);
        });
    });
    
    document.querySelectorAll('.btn-delete[data-id]').forEach(btn => {
        btn.addEventListener('click', function() {
            const categoriaId = this.getAttribute('data-id');
            eliminarCategoria(categoriaId);
        });
    });
}

// Editar categoría
function editarCategoria(categoriaId) {
    const categoria = categorias.find(c => c.id === categoriaId);
    
    if (!categoria) return;
    
    document.getElementById('categoria-id').value = categoria.id;
    document.getElementById('categoria-nombre').value = categoria.nombre;
    document.getElementById('categoria-descripcion').value = categoria.descripcion;
    
    document.getElementById('categoria-form-container').style.display = 'block';
    document.getElementById('categoria-form-title').textContent = 'Editar Categoría';
    editandoCategoria = true;
}

// Eliminar categoría
async function eliminarCategoria(categoriaId) {
    if (confirm('¿Está seguro de que desea eliminar esta categoría?')) {
        try {
            const role = localStorage.getItem('adminRole') || null;
            if (role !== 'admin') { alert('No tienes permisos para eliminar categorías.'); return; }
            await deleteDoc(doc(db, 'categorias', categoriaId));
            alert('✅ Categoría eliminada correctamente');
            cargarCategorias();
            localStorage.setItem('categoriasActualizadas', Date.now().toString());
        } catch (error) {
            console.error("Error al eliminar categoría: ", error);
            alert('❌ Error al eliminar la categoría: ' + error.message);
        }
    }
}

// ========== GESTIÓN DE PUBLICACIONES ==========

// Mostrar formulario de publicación
function mostrarFormPublicacion() {
    const role = localStorage.getItem('adminRole') || null;
    if (role !== 'admin') {
        alert('No tienes permisos para crear o editar publicaciones. Inicia sesión con una cuenta administrativa.');
        return;
    }

    document.getElementById('publicacion-form-container').style.display = 'block';
    document.getElementById('publicacion-form-title').textContent = 'Crear Nueva Publicación';
    document.getElementById('publicacion-form').reset();
    document.getElementById('publicacion-imagen-url-preview').innerHTML = '';
    editandoPublicacion = false;
}

// Ocultar formulario de publicación
function ocultarFormPublicacion() {
    document.getElementById('publicacion-form-container').style.display = 'none';
    editandoPublicacion = false;
}

// CORREGIDO: Función guardarPublicacion (estaba duplicada como guardarCategoria)
async function guardarPublicacion(e) {
    e.preventDefault();
    
    const publicacionId = document.getElementById('publicacion-id').value;
    const titulo = document.getElementById('publicacion-titulo').value;
    const contenido = document.getElementById('publicacion-contenido').value;
    const imagenUrl = document.getElementById('publicacion-imagen-url').value;
    
    if (!titulo || !contenido) {
        alert('Por favor, complete todos los campos obligatorios');
        return;
    }
    
    const publicacionData = {
        titulo,
        contenido,
        imagenUrl: imagenUrl || 'https://via.placeholder.com/400x200?text=Sin+imagen',
        fechaActualizacion: serverTimestamp()
    };
    
    try {
        const role = localStorage.getItem('adminRole') || null;
        if (role !== 'admin') {
            alert('No tienes permisos para guardar publicaciones. Inicia sesión con una cuenta administrativa.');
            return;
        }

        if (editandoPublicacion) {
            await updateDoc(doc(db, 'publicaciones', publicacionId), publicacionData);
            alert('✅ Publicación actualizada correctamente');
        } else {
            await addDoc(collection(db, 'publicaciones'), {
                ...publicacionData,
                fechaCreacion: serverTimestamp()
            });
            alert('✅ Publicación creada correctamente');
        }
        
        ocultarFormPublicacion();
        cargarPublicaciones();
    } catch (error) {
        console.error("Error al guardar publicación: ", error);
        alert('❌ Error al guardar la publicación: ' + error.message);
    }
}

// Cargar publicaciones
async function cargarPublicaciones() {
    try {
        const q = query(collection(db, 'publicaciones'), orderBy('fechaActualizacion', 'desc'));
        const querySnapshot = await getDocs(q);
        
        publicaciones = [];
        querySnapshot.forEach((doc) => {
            publicaciones.push({
                id: doc.id,
                ...doc.data()
            });
        });
        mostrarPublicacionesEnTabla();
    } catch (error) {
        console.error("Error al cargar publicaciones: ", error);
        document.getElementById('publicaciones-tbody').innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">
                    <p>Error al cargar las publicaciones</p>
                    <small>${error.message}</small>
                </td>
            </tr>
        `;
    }
}

// Mostrar publicaciones en la tabla
function mostrarPublicacionesEnTabla() {
    const tbody = document.getElementById('publicaciones-tbody');
    
    if (publicaciones.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">
                    <p>No hay publicaciones registradas</p>
                    <small>Haz clic en "Crear Publicación" para comenzar</small>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = '';
    
    publicaciones.forEach(publicacion => {
        const fecha = publicacion.fechaActualizacion ? 
            publicacion.fechaActualizacion.toDate ? 
                publicacion.fechaActualizacion.toDate().toLocaleDateString() : 
                new Date(publicacion.fechaActualizacion.seconds * 1000).toLocaleDateString() : 
            'Fecha no disponible';
        
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>${publicacion.titulo}</td>
            <td>${publicacion.contenido.substring(0, 50)}${publicacion.contenido.length > 50 ? '...' : ''}</td>
            <td>${fecha}</td>
            <td>
                <button class="btn-edit" data-id="${publicacion.id}">Editar</button>
                <button class="btn-delete" data-id="${publicacion.id}">Eliminar</button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    document.querySelectorAll('.btn-edit[data-id]').forEach(btn => {
        btn.addEventListener('click', function() {
            const publicacionId = this.getAttribute('data-id');
            editarPublicacion(publicacionId);
        });
    });
    
    document.querySelectorAll('.btn-delete[data-id]').forEach(btn => {
        btn.addEventListener('click', function() {
            const publicacionId = this.getAttribute('data-id');
            eliminarPublicacion(publicacionId);
        });
    });
}

// Editar publicación
function editarPublicacion(publicacionId) {
    const publicacion = publicaciones.find(p => p.id === publicacionId);
    
    if (!publicacion) return;
    
    document.getElementById('publicacion-id').value = publicacion.id;
    document.getElementById('publicacion-titulo').value = publicacion.titulo;
    document.getElementById('publicacion-contenido').value = publicacion.contenido;
    document.getElementById('publicacion-imagen-url').value = publicacion.imagenUrl || '';
    
    previsualizarImagenURL(publicacion.imagenUrl, 'publicacion-imagen-url-preview');
    
    document.getElementById('publicacion-form-container').style.display = 'block';
    document.getElementById('publicacion-form-title').textContent = 'Editar Publicación';
    editandoPublicacion = true;
}

// Eliminar publicación
async function eliminarPublicacion(publicacionId) {
    if (confirm('¿Está seguro de que desea eliminar esta publicación?')) {
        try {
            const role = localStorage.getItem('adminRole') || null;
            if (role !== 'admin') { alert('No tienes permisos para eliminar publicaciones.'); return; }
            await deleteDoc(doc(db, 'publicaciones', publicacionId));
            alert('✅ Publicación eliminada correctamente');
            cargarPublicaciones();
            localStorage.setItem('categoriasActualizadas', Date.now().toString());
        } catch (error) {
            console.error("Error al eliminar publicación: ", error);
            alert('❌ Error al eliminar la publicación: ' + error.message);
        }
    }
}

// ========== FUNCIONES AUXILIARES ==========

// Previsualizar imagen desde URL
function previsualizarImagenURL(url, previewId) {
    const preview = document.getElementById(previewId);
    
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        preview.innerHTML = `<img src="${url}" alt="Previsualización" style="max-width: 200px; margin-top: 10px; border-radius: 6px; border: 2px solid #e1e8ed;">`;
    } else {
        preview.innerHTML = '';
    }
}

// ========== FUNCIONES GLOBALES PARA COMUNICACIÓN ENTRE PESTAÑAS ==========

// Función global para que el frontend pueda recargar categorías
window.actualizarCategoriasFrontend = function() {
    console.log('Las categorías han sido actualizadas en el admin');
};

// Función para forzar la actualización del frontend
window.forzarActualizacionFrontend = async function() {
    try {
        await cargarCategorias();
        
        if (window.opener && window.opener.cargarCategorias) {
            window.opener.cargarCategorias();
        }
        
        localStorage.setItem('categoriasActualizadas', Date.now().toString());
        
    } catch (error) {
        console.error('Error al actualizar frontend:', error);
    }
};