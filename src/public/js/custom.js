function confirmarSalir() {
    Swal.fire({
        title: '¿Quieres cerrar tu sesión?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Salir'
    }).then((result) => {
        if (result.isConfirmed) {
            
            Swal.fire(
                'Haz cerrado tu sesión',
                'success'
            )
        }
    })
}