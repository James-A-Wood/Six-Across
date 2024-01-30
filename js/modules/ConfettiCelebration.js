

import '../libraries/konva.js';


const log = console.log;


function ConfettiCelebration(settings = {}) {

    const numPieces = settings.numPieces ?? (window.innerHeight > window.innerWidth ? 200 : 400);
    const colors = settings.colors ?? ["red", "green", "blue", "yellow", "orange", "pink", "purple"];
    const numFlipsPerSecond = settings.numFlipsPerSecond ?? 5;
    const fallMs = settings.fallMs ?? 1500;

    const tweensArray = [];
    const body = document.querySelector("body");

    let stageHolder, stage, layer;

    ["keydown", "touch"].forEach(event => window.addEventListener(event, () => this.cleanUp()));

    this.cleanUp = () => {
        tweensArray.forEach(tween => tween.destroy());
        tweensArray.length = 0;
        stageHolder?.remove();
    };

    const confettiMaster = new Konva.Rect({
        height: window.innerHeight / 50,
        width: window.innerWidth / 50,
    });

    const newPiece = i => {

        setTimeout(() => {

            if (!stageHolder) return false;

            const color = colors[Math.floor(Math.random() * colors.length)];
            const howClose = 0.5 + Math.random();
            const rotation = 1200 * (Math.random() > 0.5 ? 1 : -1);

            const piece = confettiMaster.clone({
                fill: color,
                y: -confettiMaster.height(),
                x: Math.random() * stage.width(),
                rotation: Math.random() * 360,
            }).moveTo(layer);

            piece.offsetX(piece.width() / 2).offsetY(piece.height() / 2)
                .scaleX(howClose).scaleY(howClose);

            const dropTween = new Konva.Tween({
                node: piece,
                y: stage.height() + piece.height() * howClose,
                duration: fallMs / 1000 * (2 - howClose),
                rotation: rotation,
                easing: Konva.Easings.EaseIn,
                onFinish: () => {
                    piece.destroy();
                    if (i === numPieces - 1) this.cleanUp();
                }
            }).play();
            const flipTween = new Konva.Tween({
                node: piece,
                width: 0,
                yoyo: true,
                duration: numFlipsPerSecond / 60,
            }).play();

            tweensArray.push(dropTween, flipTween);

        }, i * 2000 / numPieces);
    };

    this.clear = () => undefined;
    this.onTouch = () => undefined;

    this.new = () => {
        document.querySelector("#confetti-holder")?.remove();
        stageHolder = document.createElement("div");
        stageHolder.id = "confetti-holder";
        stageHolder.style.position = "fixed";
        stageHolder.style.top = "0";
        stageHolder.style.left = "0";
        stageHolder.style.width = "100%";
        stageHolder.style.height = "100%";
        body.appendChild(stageHolder);

        stage = new Konva.Stage({
            container: stageHolder,
            width: window.innerWidth,
            height: window.innerHeight,
        });
        layer = new Konva.Layer();
        layer.moveTo(stage);

        for (let i = 0; i < numPieces; i++) newPiece(i);

        const touchRect = new Konva.Rect({
            fill: "transparent",
            height: stage.height(),
            width: stage.width(),
            x: 0,
            y: 0,
        }).moveTo(layer);
        touchRect.on("click touchstart", () => {
            this.cleanUp();
            this.onTouch();
        });
    };
}

export { ConfettiCelebration };
