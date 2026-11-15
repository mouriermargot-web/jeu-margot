# VALCOURT

**Jeu d'horreur coopératif pour deux joueurs, en local, sur un seul écran partagé.**

Octobre. Léa (8 ans) et son grand frère Tom (11 ans) se réveillent séparés dans le manoir Valcourt, abandonné depuis 1974. Ils ne sont pas seuls : quelqu'un vit encore ici, une lanterne à la main, et fredonne une berceuse en marchant. Il faut s'échapper de la maison.

## Lancer le jeu

Aucune installation : **double-cliquez sur `index.html`**. Le jeu s'ouvre dans votre navigateur (Chrome, Edge ou Firefox récent) et fonctionne hors ligne.

- Jouez de préférence en plein écran (F11), dans le noir, au casque ou avec des enceintes stéréo. Le son de gauche correspond à Léa (écran de gauche), celui de droite à Tom.
- Réglez la luminosité dans **Options** avant de commencer.
- Si le jeu rame : désactivez « Ombres dynamiques » dans les Options.

## Commandes

| Action | Léa (J1, écran gauche) | Tom (J2, écran droit) |
|---|---|---|
| Se déplacer | Z Q S D (QWERTY : W A S D) | ↑ ↓ pour avancer/reculer, ← → pour tourner |
| Regarder | Souris (cliquer dans le jeu pour la capturer) | ← → |
| Courir | Maj gauche | U ou Maj droite |
| S'accroupir | C | N ou Ctrl droit |
| Interagir / valider | E ou Espace | K ou Entrée |
| Lampe torche | F | J |
| Objet suivant | R | L |
| Donner l'objet à l'autre | G | O |
| Pause | Échap | P ou Échap |

Les **manettes** sont prises en charge : choisissez-les pour chaque joueur dans les Options.

## Comment ça se joue

- **Parlez-vous.** Au début, vous êtes séparés : chacun trouve les indices dont l'autre a besoin.
- **Le Gardien** voit les lampes allumées de loin et entend les pas de course. Accroupi et lampe éteinte, vous êtes presque invisible.
- **Les armoires** sont des cachettes sûres... sauf s'il vous a vu y entrer.
- **S'il vous attrape**, il vous enferme dans la cellule du sous-sol. Forcez la porte (maintenir la touche d'interaction) ou attendez que l'autre vienne vous ouvrir. **S'il vous attrape tous les deux en même temps, c'est perdu** : vous reprenez au début du chapitre.
- Certaines choses se font **à deux, en même temps** (portes très lourdes, armoire à pousser, barre de la porte d'entrée).
- Certaines portes ont une **serrure à énigme** (calcul ou devinette, 4 réponses possibles). Une mauvaise réponse fait du bruit et attire le Gardien.
- Des **screamers** (apparitions soudaines avec cri) surviennent de temps en temps. On peut les désactiver dans les Options.
- Les **piles** sont rares : éteignez votre lampe quand vous pouvez.
- Les codes sont **tirés au hasard à chaque nouvelle partie**.
- Sauvegarde automatique à chaque chapitre et toutes les minutes. Menu Pause → « Sauvegarder et quitter » pour reprendre plus tard avec « Continuer ».

## Contenu

5 chapitres dans une grande maison sur 4 niveaux (sous-sol, rez-de-chaussée, étage, grenier), environ 35 pièces, une vingtaine d'énigmes, des documents à lire qui racontent l'histoire de la famille Valcourt.

**Durée estimée : 2 à 3 heures** pour une première partie, en explorant et en lisant les documents. Des joueurs qui vont droit au but ou qui connaissent déjà les solutions finiront nettement plus vite.

Bloqués ? Une soluce (avec spoilers) se trouve dans [SOLUTION.md](SOLUTION.md).

## Technique

- HTML + JavaScript, rendu 3D avec [three.js](https://threejs.org) r158 (inclus dans `js/`, licence MIT : `js/THREE_LICENSE`).
- Textures photo libres de droits (CC0) de [Poly Haven](https://polyhaven.com), intégrées dans `js/assets.js`. Modèles 3D, sons et musique générés par le code.
- `js/data.js` : plans des étages, objets, énigmes et textes. C'est le fichier à modifier pour changer le contenu.
- `js/world.js` : construction de la maison · `js/models.js` : meubles et personnages · `js/textures.js` : textures · `js/audio.js` : son · `js/game.js` : logique, IA, sauvegarde · `js/ui.js` : interface.
