const listaComentarios = document.querySelector('#listaComentarios')
const appendNote = note => {
    listaComentarios.innerHTML += `
        <ul class="timeline animate__animated animate__fadeInUp">
            <li>
                <div class="timeline-badge primary"></div>
                <a class="timeline-panel text-muted">
                    <span class="fechaMensajes">${note.fecha}</span>
                    <h6 class="mb-0 txtSidebar">${note.comentario}<br>
                        <span class="txtYellow">${note.consultor} - ${note.rol}</span>
                    </h6>
                </a>
            </li> 
        </ul>
    `
}