// Configuración de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

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

// Variables globales
let productos = [];
let categorias = [];
let publicaciones = [];
let categoriaActiva = 'todos';
let paginaActual = 1;
const productosPorPagina = 9;
let intervaloPublicaciones;

// Función para formatear precio en Peso Chileno
function formatearPrecioCLP(precio) {
    try {
        if (precio === null || precio === undefined || precio === '') return '$0';
        
        const numero = Number(precio);
        if (isNaN(numero)) return '$0';
        
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(numero);
    } catch (error) {
        console.error('Error formateando precio:', error, precio);
        return '$0';
    }
}

// Función para formatear fecha
function formatearFecha(fecha) {
    if (!fecha) return 'Fecha no disponible';
    
    try {
        const date = fecha.toDate ? fecha.toDate() : new Date(fecha);
        return date.toLocaleDateString('es-CL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        console.error('Error formateando fecha:', error);
        return 'Fecha no disponible';
    }
}

// Cargar productos y categorías al iniciar
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Iniciando aplicación...');
    mostrarLoader();
    cargarDatos();
    configurarEventListeners();
    configurarMenuMovil();
});

// Función para cargar todos los datos
async function cargarDatos() {
    try {
        await Promise.all([
            cargarCategorias(),
            cargarProductos(),
            cargarPublicaciones()
        ]);
        console.log('✅ Todos los datos cargados correctamente');
    } catch (error) {
        console.error('❌ Error cargando datos:', error);
    } finally {
        ocultarLoader();
    }
}

// Mostrar y ocultar loader
let _loaderShownAt = 0;
const _minLoaderMs = 3000; // tiempo mínimo que debe mostrarse el loader (5s)
let _loaderShownOnce = false; // evitar reabrir el loader después de ocultarlo una vez

function mostrarLoader() {
    // Si ya se mostró y ocultó una vez, no volver a abrir el loader (evita reapariciones molestas)
    if (_loaderShownOnce) return;

    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.classList.remove('hidden');
        _loaderShownAt = Date.now();
    }
}

function ocultarLoader() {
    const loader = document.getElementById('global-loader');
    if (!loader) return;

    const now = Date.now();
    const elapsed = Math.max(0, now - (_loaderShownAt || 0));
    const remaining = _minLoaderMs - elapsed;

    if (remaining > 0) {
        // esperar el tiempo restante antes de ocultar
        setTimeout(() => {
            loader.classList.add('hidden');
            _loaderShownOnce = true;
        }, remaining);
    } else {
        loader.classList.add('hidden');
        _loaderShownOnce = true;
    }
}

// Configurar event listeners
function configurarEventListeners() {
    // Modal
    const modal = document.getElementById('producto-modal');
    const closeBtn = modal.querySelector('.close');
    
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Modal de publicaciones
    const modalPublicacion = document.getElementById('publicacion-modal');
    const closeBtnPublicacion = modalPublicacion.querySelector('.close');
    
    closeBtnPublicacion.addEventListener('click', function() {
        modalPublicacion.style.display = 'none';
    });
    
    window.addEventListener('click', function(e) {
        if (e.target === modalPublicacion) {
            modalPublicacion.style.display = 'none';
        }
    });
    
    // Enlaces de navegación
    document.getElementById('publicaciones-link').addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('publicaciones').scrollIntoView({ behavior: 'smooth' });
    });
    
    document.getElementById('contacto-link').addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('contacto').scrollIntoView({ behavior: 'smooth' });
    });
    
    document.getElementById('inicio-link').addEventListener('click', function(e) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Botón ver productos
    document.getElementById('ver-productos-btn').addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('productos').scrollIntoView({ behavior: 'smooth' });
    });

    // Carrusel de categorías
    configurarCarrusel();
}

// Configurar menú móvil
function configurarMenuMovil() {
    const menuToggle = document.getElementById('mobile-menu');
    const mainNav = document.getElementById('main-nav');
    
    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', function() {
            mainNav.classList.toggle('active');
            menuToggle.classList.toggle('active');
        });
        
        // Cerrar menú al hacer clic en un enlace (en móviles)
        const navLinks = document.querySelectorAll('nav a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                if (window.innerWidth <= 768) {
                    mainNav.classList.remove('active');
                    menuToggle.classList.remove('active');
                }
            });
        });
        
        // Cerrar menú al redimensionar la ventana
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768) {
                mainNav.classList.remove('active');
                menuToggle.classList.remove('active');
            }
        });
    }
}

// Configurar funcionalidad del carrusel
function configurarCarrusel() {
    const carruselContainer = document.querySelector('.categorias-container');
    const btnPrev = document.querySelector('.carrusel-prev');
    const btnNext = document.querySelector('.carrusel-next');

    if (!carruselContainer || !btnPrev || !btnNext) return;

    // Calcular desplazamiento basado en ancho de tarjeta + gap para desplazamiento consistente
    function calcularPaso() {
        const primera = carruselContainer.querySelector('.categoria-card');
        if (!primera) return 250;
        const cardWidth = Math.round(primera.getBoundingClientRect().width);
        const gapStyle = getComputedStyle(carruselContainer).gap;
        const gap = gapStyle ? Math.round(parseFloat(gapStyle)) : 24;
        return cardWidth + gap;
    }

    btnPrev.addEventListener('click', () => {
        const paso = calcularPaso();
        const target = Math.max(0, carruselContainer.scrollLeft - paso);
        animateScroll(carruselContainer, target, 450);
    });

    btnNext.addEventListener('click', () => {
        const paso = calcularPaso();
        const maxLeft = carruselContainer.scrollWidth - carruselContainer.clientWidth;
        const target = Math.min(maxLeft, carruselContainer.scrollLeft + paso);
        animateScroll(carruselContainer, target, 450);
    });

    // Soporte para teclado cuando el carrusel tiene foco
    carruselContainer.setAttribute('tabindex', '0');
    carruselContainer.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
            const paso = calcularPaso();
            const maxLeft = carruselContainer.scrollWidth - carruselContainer.clientWidth;
            const target = Math.min(maxLeft, carruselContainer.scrollLeft + paso);
            animateScroll(carruselContainer, target, 350);
        } else if (e.key === 'ArrowLeft') {
            const paso = calcularPaso();
            const target = Math.max(0, carruselContainer.scrollLeft - paso);
            animateScroll(carruselContainer, target, 350);
        }
    });
}

// Animación de scroll suave con requestAnimationFrame y easing
function animateScroll(container, to, duration = 400) {
    // Desactivar temporalmente scroll-snap para evitar el salto al final
    const prevSnap = container.style.scrollSnapType || '';
    try { container.style.scrollSnapType = 'none'; } catch (e) {}
    container.classList.add('scrolling');

    const start = container.scrollLeft;
    const change = to - start;
    const startTime = performance.now();

    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function animate(now) {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / duration);
        const eased = easeInOutCubic(t);
        container.scrollLeft = Math.round(start + change * eased);

        if (elapsed < duration) {
            requestAnimationFrame(animate);
        } else {
            // Al terminar la animación, resaltar la tarjeta más cercana al borde izquierdo
            // asegurar posición final exacta
            container.scrollLeft = to;
            // restaurar scroll-snap
            try { container.style.scrollSnapType = prevSnap; } catch (e) {}
            container.classList.remove('scrolling');
            highlightClosestCard(container);
        }
    }

    requestAnimationFrame(animate);
}

function highlightClosestCard(container) {
    const cards = Array.from(container.querySelectorAll('.categoria-card'));
    if (!cards.length) return;

    const containerRect = container.getBoundingClientRect();
    const containerLeft = containerRect.left + parseFloat(getComputedStyle(container).paddingLeft || 0);

    let closest = null;
    let minDist = Infinity;

    cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const dist = Math.abs(rect.left - containerLeft);
        if (dist < minDist) {
            minDist = dist;
            closest = card;
        }
    });

    if (closest) {
        closest.classList.add('highlight');
        setTimeout(() => closest.classList.remove('highlight'), 600);
    }
}

// Cargar categorías desde Firebase
async function cargarCategorias() {
    try {
        console.log('📦 Cargando categorías...');
        const querySnapshot = await getDocs(collection(db, 'categorias'));
        categorias = [];
        
        // Agregar la categoría "Todos" por defecto
        categorias.push({
            id: 'todos',
            nombre: 'Todos',
            descripcion: 'Ver todos los productos',
            icono: '📦'
        });

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            categorias.push({
                id: doc.id,
                nombre: data.nombre || 'Sin nombre',
                descripcion: data.descripcion || 'Sin descripción',
                icono: obtenerIconoCategoria(data.nombre)
            });
        });
        
        console.log('✅ Categorías cargadas:', categorias.length);
        mostrarCategoriasEnCarrusel();
        mostrarCategoriasEnDropdown();
    } catch (error) {
        console.error("❌ Error al cargar categorías: ", error);
    }
}

// Obtener icono según la categoría
function obtenerIconoCategoria(nombreCategoria) {
    const iconos = {
        'aseo': '🧹',
        'alimentos': '🍎',
        'limpieza': '✨',
        'hogar': '🏠',
        'higiene': '🫧',
        'bebidas': '🥤',
        'lácteos': '🥛',
        'carnes': '🥩',
        'verduras': '🥦',
        'frutas': '🍓',
        'panadería': '🥖',
        'mascotas': '🐾',
        'abarrotes': '🛒',
        'otros': '📦'

    };

    const nombreLower = nombreCategoria.toLowerCase();
    for (const [key, icono] of Object.entries(iconos)) {
        if (nombreLower.includes(key)) {
            return icono;
        }
    }
    
    return '📦'; // Icono por defecto
}

// Mostrar categorías en el carrusel
function mostrarCategoriasEnCarrusel() {
    const container = document.getElementById('categorias-container');
    
    if (categorias.length === 0) {
        container.innerHTML = '<div class="no-categories">No hay categorías disponibles</div>';
        return;
    }
    
    container.innerHTML = '';
    
    categorias.forEach(categoria => {
        const categoriaCard = document.createElement('div');
        categoriaCard.className = `categoria-card ${categoria.id === 'todos' ? 'active' : ''}`;
        categoriaCard.setAttribute('data-categoria', categoria.id);
        
        categoriaCard.innerHTML = `
            <div class="categoria-icon">${categoria.icono}</div>
            <h3>${categoria.nombre}</h3>
            <p>${categoria.descripcion}</p>
        `;
        
        categoriaCard.addEventListener('click', () => {
            // Remover clase active de todas las categorías
            document.querySelectorAll('.categoria-card').forEach(card => {
                card.classList.remove('active');
            });
            
            // Agregar clase active a la categoría clickeada
            categoriaCard.classList.add('active');
            
            // Filtrar productos
            filtrarProductos(categoria.id);
            categoriaActiva = categoria.id;
            paginaActual = 1; // Resetear a primera página al cambiar categoría
        });
        
        container.appendChild(categoriaCard);
    });
}

// Mostrar categorías en el dropdown del menú
function mostrarCategoriasEnDropdown() {
    const dropdown = document.getElementById('categorias-dropdown');
    
    if (categorias.length === 0) return;
    
    dropdown.innerHTML = '';
    
    categorias.forEach(categoria => {
        if (categoria.id !== 'todos') { // No mostrar "Todos" en el dropdown
            const li = document.createElement('li');
            li.innerHTML = `<a href="#" data-categoria="${categoria.id}">${categoria.nombre}</a>`;
            
            li.addEventListener('click', (e) => {
                e.preventDefault();
                // Encontrar y activar la categoría en el carrusel
                const categoriaCard = document.querySelector(`.categoria-card[data-categoria="${categoria.id}"]`);
                if (categoriaCard) {
                    document.querySelectorAll('.categoria-card').forEach(card => {
                        card.classList.remove('active');
                    });
                    categoriaCard.classList.add('active');
                    filtrarProductos(categoria.id);
                    categoriaActiva = categoria.id;
                    paginaActual = 1; // Resetear a primera página al cambiar categoría
                    
                    // Scroll al carrusel de categorías
                    document.querySelector('.categorias').scrollIntoView({ behavior: 'smooth' });
                }
            });
            
            dropdown.appendChild(li);
        }
    });
}

// Cargar productos desde Firebase
async function cargarProductos() {
    try {
        console.log('📦 Cargando productos...');
        const q = query(collection(db, 'productos'), orderBy('fechaActualizacion', 'desc'));
        const querySnapshot = await getDocs(q);
        
        productos = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            productos.push({
                id: doc.id,
                nombre: data.nombre || 'Sin nombre',
                descripcion: data.descripcion || 'Sin descripción',
                precio: data.precio || 0,
                categoria: data.categoria || 'otros',
                imagenUrl: data.imagenUrl || 'https://via.placeholder.com/300x200?text=Sin+imagen',
                fechaActualizacion: data.fechaActualizacion
            });
        });
        
        console.log('✅ Productos cargados:', productos.length);
        console.log('📋 Categorías en productos:', [...new Set(productos.map(p => p.categoria))]);
        
        // Mostrar productos según la categoría activa
        if (categoriaActiva === 'todos') {
            mostrarProductos(productos);
        } else {
            const productosFiltrados = productos.filter(producto => producto.categoria === categoriaActiva);
            mostrarProductos(productosFiltrados);
        }
    } catch (error) {
        console.error("❌ Error al cargar productos: ", error);
        document.getElementById('productos-grid').innerHTML = '<p class="no-products">Error al cargar los productos. Por favor, intenta más tarde.</p>';
    }
}

// Mostrar productos en la grid con paginación
function mostrarProductos(productosArray) {
    const productosGrid = document.getElementById('productos-grid');
    
    console.log('🎯 Mostrando productos:', productosArray.length);
    
    if (productosArray.length === 0) {
        productosGrid.innerHTML = `
            <div class="no-products">
                <p>No hay productos disponibles en esta categoría</p>
                <small>Intenta con otra categoría o vuelve más tarde</small>
            </div>
        `;
        return;
    }
    
    // Calcular productos para la página actual
    const inicio = (paginaActual - 1) * productosPorPagina;
    const fin = inicio + productosPorPagina;
    const productosPagina = productosArray.slice(inicio, fin);
    
    productosGrid.innerHTML = '';
    
    productosPagina.forEach(producto => {
        const productoCard = document.createElement('div');
        productoCard.className = 'producto-card';
        productoCard.setAttribute('data-id', producto.id);
        
        const precioFormateado = formatearPrecioCLP(producto.precio);
        
        productoCard.innerHTML = `
            <!-- Sección de imagen del producto -->
            <section class="producto-imagen-section">
                <img src="${producto.imagenUrl}" alt="${producto.nombre}" loading="lazy">
                <div class="producto-overlay"></div>
                
                <!-- Información en la parte superior -->
                <div class="producto-info-top">
                    <div class="producto-categoria">${producto.categoria}</div>
                    <div class="producto-precio-top">${precioFormateado}</div>
                </div>
            </section>

            <!-- Sección de contenido inferior -->
            <section class="producto-content-section">
                <h3 class="producto-nombre">${producto.nombre}</h3>
                <button class="producto-btn-ver">
                    <span class="btn-text">Ver detalles</span>
                    <div class="fill-container"></div>
                </button>
            </section>
        `;
        
        productosGrid.appendChild(productoCard);
    });
    
    // Agregar controles de paginación si es necesario
    const totalPaginas = Math.ceil(productosArray.length / productosPorPagina);
    if (totalPaginas > 1) {
        const controlesPaginacion = document.createElement('div');
        controlesPaginacion.className = 'controles-paginacion';
        controlesPaginacion.style.cssText = `
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 1rem;
            margin-top: 2rem;
            grid-column: 1 / -1;
        `;
        
        controlesPaginacion.innerHTML = `
            <button class="btn-paginacion ${paginaActual === 1 ? 'disabled' : ''}" id="btn-pagina-anterior" ${paginaActual === 1 ? 'disabled' : ''}>
                ← Página anterior
            </button>
            <span class="info-paginacion">
                Página ${paginaActual} de ${totalPaginas}
            </span>
            <button class="btn-paginacion ${paginaActual === totalPaginas ? 'disabled' : ''}" id="btn-pagina-siguiente" ${paginaActual === totalPaginas ? 'disabled' : ''}>
                Siguiente página →
            </button>
        `;
        
        productosGrid.appendChild(controlesPaginacion);
        
        // Event listeners para los botones de paginación
        document.getElementById('btn-pagina-anterior').addEventListener('click', () => {
            if (paginaActual > 1) {
                paginaActual--;
                mostrarProductos(productosArray);
                // Llevar la vista a la sección de productos al cambiar de página
                const productosSection = document.getElementById('productos');
                if (productosSection) {
                    productosSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
        
        document.getElementById('btn-pagina-siguiente').addEventListener('click', () => {
            if (paginaActual < totalPaginas) {
                paginaActual++;
                mostrarProductos(productosArray);
                // Llevar la vista a la sección de productos al cambiar de página
                const productosSection = document.getElementById('productos');
                if (productosSection) {
                    productosSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    }
    
    // Agregar event listeners a las tarjetas de productos y botones
    const productoCards = document.querySelectorAll('.producto-card');
    const productoBtns = document.querySelectorAll('.producto-btn-ver');
    
    productoCards.forEach(card => {
        card.addEventListener('click', function(e) {
            // Evitar que se active cuando se hace clic en el botón
            if (!e.target.closest('.producto-btn-ver')) {
                const productoId = this.getAttribute('data-id');
                mostrarDetallesProducto(productoId);
            }
        });
    });
    
    productoBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation(); // Evitar que el clic se propague a la tarjeta
            const productoCard = this.closest('.producto-card');
            const productoId = productoCard.getAttribute('data-id');
            mostrarDetallesProducto(productoId);
        });
    });
}

// Cargar publicaciones desde Firebase
async function cargarPublicaciones() {
    try {
        console.log('📰 Cargando publicaciones...');
        const q = query(collection(db, 'publicaciones'), orderBy('fechaActualizacion', 'desc'));
        const querySnapshot = await getDocs(q);
        
        publicaciones = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            publicaciones.push({
                id: doc.id,
                titulo: data.titulo || 'Sin título',
                contenido: data.contenido || 'Sin contenido',
                imagenUrl: data.imagenUrl || 'https://via.placeholder.com/400x200?text=Sin+imagen',
                fecha: data.fechaActualizacion || new Date()
            });
        });
        
        console.log('✅ Publicaciones cargadas:', publicaciones.length);
        mostrarPublicaciones(publicaciones);
    } catch (error) {
        console.error("❌ Error al cargar publicaciones: ", error);
        document.getElementById('publicaciones-grid').innerHTML = '<p class="no-publicaciones">Error al cargar las publicaciones. Por favor, intenta más tarde.</p>';
    }
}

// Mostrar publicaciones en formato carrusel automático
function mostrarPublicaciones(publicacionesArray) {
    const publicacionesGrid = document.getElementById('publicaciones-grid');
    
    console.log('📰 Mostrando publicaciones:', publicacionesArray.length);
    
    if (publicacionesArray.length === 0) {
        publicacionesGrid.innerHTML = `
            <div class="no-publicaciones">
                <p>No hay publicaciones disponibles</p>
                <small>Vuelve pronto para ver las novedades</small>
            </div>
        `;
        return;
    }
    
    publicacionesGrid.innerHTML = '';
    
    // Crear contenedor del carrusel
    const carruselContainer = document.createElement('div');
    carruselContainer.className = 'carrusel-publicaciones';
    carruselContainer.style.cssText = `
        position: relative;
        overflow: hidden;
        border-radius: 12px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    `;
    
    // Crear track del carrusel
    const carruselTrack = document.createElement('div');
    carruselTrack.className = 'carrusel-track';
    carruselTrack.style.cssText = `
        display: flex;
        transition: transform 0.5s ease-in-out;
    `;
    
    // Crear slides
    publicacionesArray.forEach((publicacion, index) => {
        const slide = document.createElement('div');
        slide.className = 'carrusel-slide';
        slide.style.cssText = `
            min-width: 100%;
            position: relative;
        `;
        
        const fechaFormateada = formatearFecha(publicacion.fecha);
        
        slide.innerHTML = `
            <div class="publicacion-carrusel">
                <div class="publicacion-imagen-carrusel">
                    <img src="${publicacion.imagenUrl}" alt="${publicacion.titulo}" loading="lazy">
                </div>
                <div class="publicacion-info-carrusel">
                    <p class="publicacion-fecha">${fechaFormateada}</p>
                    <h3 class="publicacion-titulo">${publicacion.titulo}</h3>
                    <p class="publicacion-contenido">${publicacion.contenido.substring(0, 150)}${publicacion.contenido.length > 150 ? '...' : ''}</p>
                    <button class="btn-ver-publicacion" data-id="${publicacion.id}">Leer más</button>
                </div>
            </div>
        `;
        
        carruselTrack.appendChild(slide);
    });
    
    carruselContainer.appendChild(carruselTrack);
    publicacionesGrid.appendChild(carruselContainer);
    
    // Iniciar carrusel automático
    iniciarCarruselAutomatico(carruselTrack, publicacionesArray.length);
    
    // Agregar event listeners a los botones "Leer más"
    const verBtns = document.querySelectorAll('.btn-ver-publicacion');
    verBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const publicacionId = this.getAttribute('data-id');
            mostrarDetallesPublicacion(publicacionId);
        });
    });
}

// Iniciar carrusel automático para publicaciones
function iniciarCarruselAutomatico(carruselTrack, totalSlides) {
    let slideActual = 0;
    
    // Limpiar intervalo anterior si existe
    if (intervaloPublicaciones) {
        clearInterval(intervaloPublicaciones);
    }
    
    // Función para mover al siguiente slide
    function siguienteSlide() {
        slideActual = (slideActual + 1) % totalSlides;
        carruselTrack.style.transform = `translateX(-${slideActual * 100}%)`;
    }
    
    // Iniciar intervalo automático cada 10 segundos
    intervaloPublicaciones = setInterval(siguienteSlide, 10000);
    
    // Pausar carrusel al hacer hover
    carruselTrack.parentElement.addEventListener('mouseenter', () => {
        clearInterval(intervaloPublicaciones);
    });
    
    // Reanudar carrusel al salir del hover
    carruselTrack.parentElement.addEventListener('mouseleave', () => {
        intervaloPublicaciones = setInterval(siguienteSlide, 6000);
    });
}

// Filtrar productos por categoría
function filtrarProductos(categoriaId) {
    console.log('🔍 Filtrando por categoría:', categoriaId);
    
    if (categoriaId === 'todos') {
        mostrarProductos(productos);
    } else {
        // Buscar el nombre de la categoría por su ID
        const categoria = categorias.find(c => c.id === categoriaId);
        if (categoria) {
            const productosFiltrados = productos.filter(producto => 
                producto.categoria.toLowerCase() === categoria.nombre.toLowerCase()
            );
            console.log('📊 Productos filtrados:', productosFiltrados.length);
            mostrarProductos(productosFiltrados);
        } else {
            console.log('❌ Categoría no encontrada:', categoriaId);
            mostrarProductos([]);
        }
    }
}

// Mostrar detalles del producto en modal
function mostrarDetallesProducto(productoId) {
    const producto = productos.find(p => p.id === productoId);
    
    if (!producto) return;
    
    const modal = document.getElementById('producto-modal');
    const modalImg = document.getElementById('modal-img');
    const modalTitulo = document.getElementById('modal-titulo');
    const modalDescripcion = document.getElementById('modal-descripcion');
    const modalPrecio = document.getElementById('modal-precio');
    const modalCategoria = document.getElementById('modal-categoria');
    const btnContacto = modal.querySelector('.uiverse-btn');
    
    modalImg.src = producto.imagenUrl;
    modalImg.alt = producto.nombre;
    modalTitulo.textContent = producto.nombre;
    modalDescripcion.textContent = producto.descripcion;
    modalPrecio.textContent = formatearPrecioCLP(producto.precio);
    modalCategoria.textContent = producto.categoria;
    
    // Configurar botón de contacto
    btnContacto.onclick = function() {
        const mensaje = `Hola, estoy interesado en el producto: ${producto.nombre}`;
        const urlWhatsApp = `https://wa.me/56950104100?text=${encodeURIComponent(mensaje)}`;
        window.open(urlWhatsApp, '_blank');
    };
    
    modal.style.display = 'block';
}

// Mostrar detalles de la publicación en modal
function mostrarDetallesPublicacion(publicacionId) {
    const publicacion = publicaciones.find(p => p.id === publicacionId);
    
    if (!publicacion) return;
    
    const modal = document.getElementById('publicacion-modal');
    const modalImg = document.getElementById('modal-publicacion-img');
    const modalTitulo = document.getElementById('modal-publicacion-titulo');
    const modalContenido = document.getElementById('modal-publicacion-contenido');
    const modalFecha = document.getElementById('modal-publicacion-fecha');
    
    modalImg.src = publicacion.imagenUrl;
    modalImg.alt = publicacion.titulo;
    modalTitulo.textContent = publicacion.titulo;
    modalContenido.textContent = publicacion.contenido;
    modalFecha.textContent = formatearFecha(publicacion.fecha);
    
    modal.style.display = 'block';
}

// Sistema de comunicación para actualizaciones en tiempo real
class ComunicacionFrontend {
    constructor() {
        this.ultimaActualizacion = 0;
        this.inicializar();
    }
    
    inicializar() {
        // Escuchar cambios en localStorage
        window.addEventListener('storage', (e) => {
            if (e.key === 'categoriasActualizadas') {
                this.manejarActualizacion();
            }
        });
        
        // Verificar actualizaciones periódicamente
        setInterval(() => {
            this.verificarActualizaciones();
        }, 3000);
    }
    
    manejarActualizacion() {
        console.log('🔄 Actualizando desde admin...');
        mostrarLoader();
        cargarDatos();
    }
    
    verificarActualizaciones() {
        const timestamp = localStorage.getItem('categoriasActualizadas');
        if (timestamp && parseInt(timestamp) > this.ultimaActualizacion) {
            this.ultimaActualizacion = parseInt(timestamp);
            this.manejarActualizacion();
        }
    }
}

// Efecto de navbar al hacer scroll
window.addEventListener('scroll', function() {
    const header = document.querySelector('header');
    const scrollPosition = window.scrollY;
    
    if (scrollPosition > 100) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// Smooth scroll para todos los enlaces
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Inicializar comunicación en el frontend
const comunicacionFrontend = new ComunicacionFrontend();