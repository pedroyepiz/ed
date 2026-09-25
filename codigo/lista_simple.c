/* Ejemplo didáctico: lista enlazada simple en C. */
#include <stdio.h>
#include <stdlib.h>

typedef struct Nodo {
    int dato;
    struct Nodo *siguiente;
} Nodo;

int insertar_final(Nodo **cabeza, int valor) {
    Nodo *nuevo = malloc(sizeof *nuevo);
    if (nuevo == NULL) return 0;
    nuevo->dato = valor;
    nuevo->siguiente = NULL;
    if (*cabeza == NULL) {
        *cabeza = nuevo;
        return 1;
    }
    Nodo *actual = *cabeza;
    while (actual->siguiente != NULL) actual = actual->siguiente;
    actual->siguiente = nuevo;
    return 1;
}

int eliminar_primero(Nodo **cabeza, int *valor) {
    if (*cabeza == NULL) return 0;
    Nodo *viejo = *cabeza;
    *valor = viejo->dato;
    *cabeza = viejo->siguiente;
    free(viejo);
    return 1;
}

void imprimir(const Nodo *actual) {
    while (actual != NULL) {
        printf("[%d] -> ", actual->dato);
        actual = actual->siguiente;
    }
    puts("NULL");
}

void liberar(Nodo **cabeza) {
    int descartado;
    while (eliminar_primero(cabeza, &descartado)) { }
}

int main(void) {
    Nodo *cabeza = NULL;
    int valores[] = {10, 25, 40};
    for (size_t i = 0; i < sizeof valores / sizeof valores[0]; ++i) {
        if (!insertar_final(&cabeza, valores[i])) {
            fputs("No hay memoria suficiente.\n", stderr);
            liberar(&cabeza);
            return EXIT_FAILURE;
        }
    }
    imprimir(cabeza);
    int primero;
    if (eliminar_primero(&cabeza, &primero))
        printf("Eliminado: %d\n", primero);
    imprimir(cabeza);
    liberar(&cabeza);
    return EXIT_SUCCESS;
}
