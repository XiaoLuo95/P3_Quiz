const Sequelize = require('sequelize');
const {log, biglog, errorlog, colorize} = require("./out");
const {models} = require('./model');


/**
 * Muestra la ayuda.
 *
 * @param rl    Objeto readline usado para implementar el CLI.
 */
exports.helpCmd = rl => {
    log('Commandos:');
    log('  h|help - Muestra esta ayuda.');
    log('  list - Listar los quizzes existentes.');
    log('  show <id> - Muestra la pregunta y la respuesta el quiz indicado.');
    log('  add - Añadir un nuevo quiz interactivamente.');
    log('  delete <id> - Borrar el quiz indicado.');
    log('  edit <id> - Editar el quiz indicado.');
    log('  test <id> - Probar el quiz indicado.');
    log('  p|play - Jugar a preguntar aleatoriamente todos los quizzes.');
    log('  credits - Créditos.');
    log('  q|quit - Salir del programa.');
    rl.prompt();
};


/**
 * Lista todos los quizzes existentes en el modelo.
 *
 * @param rl    Objeto readline usado para implementar el CLI.
 */
exports.listCmd = rl => {
    models.quiz.findAll()
    .each(quiz => {
            log(` [${colorize(quiz.id, 'magenta')}]:    ${quiz.question}`);
    })
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    })
};


/**
 * Esta funcion devuelve una promesa que:
 *  - Valida que se ha introducido un valor para el parametro.
 *  - Convierte el parametro en un numero entero.
 * Si todo va bien, la promesa se satisface y devuelve el valor de id a usuario.
 *
 * @param id    Parametro con el índice a validar.
 */
const validateId = id => {
    return new Sequelize.Promise((resolve, reject) => {
        if (typeof id === "undefined") {
            reject(new Error(`Falta el parametro <id>.`));
        } else {
            id = parseInt(id);  //coger la parte entera y descartar lo demas
            if (Number.isNaN(id)) {
                reject(new Error(`El valor del parámetro <id> no es un número.`));
            } else {
                resolve(id);
            }
        }
    })
};


/**
 * Muestra el quiz indicado en el parámetro: la pregunta y la respuesta.
 *
 * @param rl    Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a mostrar.
 */
exports.showCmd = (rl, id) => {
    validateId(id)
    .then(id => models.quiz.findById(id))
    .then(quiz => {
        if (!quiz) {
            throw new Error(`No existe un quiz asociado al id=${id}.`);
        }
        log(` [${colorize(quiz.id, 'magenta')}]:    ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
    })
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    })
};


/**
 * Esta función convierte la llamada rl.question, que está basada en callbacks, en una versión
 * basada en promesas.
 *
 * Esta función devuelve una promesa que cuando se cumple, proporciona el texto introducido por el usuario.
 * Entonces la llamada a then que hay que hacer la promesa devuelta sera:
 *      .then(answer => {...})
 *
 * También colorea en rojo el texto de la pregunta, elimina espacios al principio y final de la respuesta.
 *
 * @param rl    Objeto readline usado para implementar el CLI.
 * @param text  Pregunta que hay que haerle al usuario.
 */
const makeQuestion = (rl, text) => {
    return new Sequelize.Promise((resolve, reject) => {
        rl.question(colorize(text, 'red'), answer => {
            resolve(answer.trim());
        });
    })
};

/**
 * Añade un nuevo quiz al modelo.
 * Pregunta interactivamente por la pregunta y por la respuesta.
 *cle
 * @param rl    Objeto readline usado para implementar el CLI.
 */
exports.addCmd = rl => {
    makeQuestion(rl, 'Introduzca una pregunta: ')
    .then(q => {
        return makeQuestion(rl, 'Introduzca la respuesta ')
        .then(a => {
            return {question: q, answer: a};
        });
    })
    .then(quiz => {
        return models.quiz.create(quiz);
    })
    .then((quiz) => {
        log(` ${colorize('Se ha añadido', 'magenta')}:  ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
    })
    .catch(Sequelize.ValidationError, error => {
        errorlog('El quiz es erroneo:');
        error.errors.forEach(({message}) => errorlog(message));
    })
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    })
};


/**
 * Borra un quiz del modelo.
 *
 * @param rl    Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a borrar en el modelo.
 */
exports.deleteCmd = (rl, id) => {
    validateId(id)
    .then(id => models.quiz.destroy({where: {id}}))
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    })
};


/**
 * Edita un quiz del modelo.
 *
 * @param rl    Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a editar en el modelo.
 */
exports.editCmd = (rl, id) => {
    validateId(id)
    .then(id => models.quiz.findById(id))
    .then(quiz => {
        if(!quiz) {
            throw new Error(`No existe un quiz asociado al id=${id}.`);
        }

        process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
        return makeQuestion(rl, 'Introduzca la pregunta: ')
        .then(q => {
            process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);
            return makeQuestion(rl, 'Introduzca la respuesta ')
            .then(a => {
                quiz.question = q;
                quiz.answer = a;
                return quiz;
            });
        });
    })
    .then(quiz => {
        return quiz.save();
    })
    .then(quiz => {
        log(` Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
    })
    .catch(Sequelize.ValidationError, error => {
        errorlog('El quiz es erroneo:');
        error.errors.forEach(({message}) => errorlog(message));
    })
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    })
};


/**
 * Prueba un quiz, es decir, hace una pregunta del modelo a la que debemos contestar.
 *
 * @param rl    Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a probar.
 */
exports.testCmd = (rl, id) => {
    validateId(id)
    .then(id => models.quiz.findById(id))
    .then(quiz => {
        if (!quiz) {
            throw new Error(`No existe un quiz asociado al id=${id}.`);
        }
        return makeQuestion(rl, quiz.question + '？ ')
        .then(a => {
            if (limpia(a) === limpia(quiz.answer)) {
                log('Su respuesta es correcta.');
                biglog('Correcta', 'green');
            } else {
                log('Su respuesta es incorrecta.');
                biglog('Incorrecta', 'red');
            }
        });
    })
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    })
};


/**
 * Función que carga los índices de elementos de quiz en un array.
 *
 * @param text  Array de índices
 * @param id    Índices de elementos
 * @returns {*}
 */
const settingUp = (text) => {
    return new Sequelize.Promise((resolve, reject) => {
        models.quiz.findAll()
        .each(quiz => {
            text.push(quiz.id);
        })
        .then(() => {
            resolve(text);
        })
    })
};


/**
 * Función que devuelve un índice aleatorio dentro del array que pasa como parámetro.
 * @param id    Índice aleatorio.
 * @param text  Array de índices.
 * @returns {*}
 */
const aleatorio = (id, text) => {
    return new Sequelize.Promise((resolve, reject) => {
        id = text[Math.floor(Math.random() * text.length)];
        text.splice(text.indexOf(id), 1);
        resolve(id);
    })
};


/**
 * El bucle que reaiza con la función de play.
 *
 * @param id    Índice del quiz a realizar.
 * @param text  Array que almacena los índices de quizzes pendientes.
 * @param rl    Objeto readline usado para implementar el CLI.
 * @param score Nota obtenida hasta momento.
 * @returns {*}
 */
const bucle = (id, text, rl, score) => {
    return new Sequelize.Promise((resolve, reject) => {
        aleatorio(id, text)
        .then(a => {
            validateId(a)
            .then(id => models.quiz.findById(id))
            .then(quiz => {
                return makeQuestion(rl, quiz.question + '? ')
                .then(a => {
                    if (limpia(a) === limpia(quiz.answer)) {
                        score += 1;
                        log(`CORRECTO - Lleva ${score} aciertos.`);
                        if (text.length !== 0) {
                            bucle(id, text, rl, score);
                            resolve();
                        } else {
                            log('No hay nada más que preguntar.');
                            log(`Fin del juego. Aciertos: ${score}`);
                            biglog(`${score}`, `magenta`);
                            rl.prompt();
                            resolve();
                        }
                    } else {
                        log('INCORRECTO.');
                        log(`Fin del juego. Aciertos: ${score}`);
                        biglog(`${score}`, `magenta`);
                        rl.prompt();
                        resolve();
                    }
                })
            })
        })
    })
};

/**
 * Pregunta todos los quizzes existentes en el modelo en orden aleatorio.
 * Se gana si se contesta a todos satisfactoriamente.
 *
 * @param rl    Objeto readline usado para implementar el CLI.
 */
exports.playCmd = rl => {

    let toBeResolved = [];
    let score = 0;
    let id;

    settingUp(toBeResolved)
    .then(() => {
        bucle(id, toBeResolved, rl, score);
    })
    .catch(error => {
        errorlog(error.message);
    })
};


/**
 * Muestra los nombres de los autores de la práctica.
 *
 * @param rl    Objeto readline usado para implementar el CLI.
 */
exports.creditsCmd = rl => {
    log('Autores de la práctica:');
    log('Xiao Luo', 'green');
    rl.prompt();
};


/**
 * Terminar el programa.
 *
 * @param rl    Objeto readline usado para implementar el CLI.
 */
exports.quitCmd = rl => {
    rl.close();
};


/**
 *  Limpiar la entrada para hacerle case non-sensitive.
 *
 *  @param comp String de entrada.
 */
limpia = comp => {
    comp = comp.replace(/\s+/g, '');
    comp = comp.toLowerCase();
    comp = comp.replace(/á/gi, "a");
    comp = comp.replace(/é/gi, "e");
    comp = comp.replace(/í/gi, "i");
    comp = comp.replace(/ó/gi, "o");
    comp = comp.replace(/ú/gi, "u");
    return comp;
};