# Objectifs
1. Corriger les mineurs erreurs de l'application
2. Améliorer l'expérience utilisateur

# Consignes
1. Ne touche à rien des theme de l'application
2. A respecter bien les composants qui sont en place comme les select customisable, les localstorages, ...

# Variables
PRODUCT_PAGE_JS : public/assets/js/admin/listProducts.js
PRODUCT_PAGE_HTML : public/admin/listProducts.html
SERVICES_PAGE_JS : public/assets/js/admin/listSevices.js
SERVICES_PAGE_HTML : public/admin/listServices.html
ORDERS_PAGE_JS : public/assets/js/admin/listOrders.js
MAIN_JS : public/assets/js/main.js
INDEX_HTML : public/index.html
TREASURY_JS : public/assets/js/admin/treasury.js
TREASURY_HTML : public/admin/treasury.html
HISTORY_HTML : public/history.html
HISTORY_JS : public/assets/js/history.js

# TAF
1. Tout les formulaires d'ajout sont désormais à enregistrer dans localStorage, à savoir : {PRODUCT_PAGE_JS}: #editProductForm, {SERVICES_PAGE_JS}: #serviceForm.
2. Rajouter un bouton icone Reinitialiser (juste une icone) dans {ORDERS_PAGE_JS}: #orderModal, à côté de h3: Nouvelle commande. Cette icone sert à reinitialiser le localStorage correspond aux données de la table #orderTable.
3. Dans {INDEX_HTML} et {MAIN_JS} il faut rajouter un "toggle Aujourd'hui" à côté des h2.title de chaque tabContent qui sert à changer la date choisie dans input#serviceDate, input#productDate et input#expenseDate. Attention, il nous faut donc trois toggles sur chaque tab.
4. Dans {TREASURY_JS} et {TREASURY_HTML}, tu peux avoir le tableau #treasuryTable et la colonne P.Commande dedans, ce que la valeur de la colonne "Solde" devra désormais en fonction aussi avec la colonne P.Commande: Solde = Report + Recettes - (Dépenses + P.Commande).
5. Dans {HISTORY_HTML} et {HISTORY_JS}, tu peux voir le span#currentDateDisplay, alors ici je voudrai rajouter un label : Lun. 05/10, Mar. 06/10, ... c'est a dire de rajouter le morceau du label du jour au debut de la date.
6. Ce point numéro 6 est très délicat et un peu compliquer que les autres : il s'agit de rajouter un calendrier dans le span#currentDateDisplay (un calendrier natif suffit). Quand je clique dessus de span, le calendrier s'ouvre et je peux choisir n'importe quelle date antérieur (JE DIS BIEN ANTERIEUR car on ne peut pas choisir une date posterieur). N'oublie pas qu'au moment de changement de date, il y a des actions (des evenements) déjà en place  donc il faut les respecter. N'oublie pas aussi que à côté de ce span, on a deux boutons de côté : button#prevDayBtn et button#nextDayBtn, on les GARDE. Le toggle #todayFilter reste inchangé aussi.
7. Pour le {TREASURY_JS}, on va le corriger aussi car les calcules ne sont pas bon. 
- Tout d'abord, la liste des dates dans le tableau #treasuryTable devra correspondre exactement comme ce qui est choisi dans le select#weekSelector. Par exemple, si je choisi : Semaine 01 - [1 Octobre - 4 Octobre], la liste dans le tableau devra être : 01/10/26 au 04/10/26 (donc on n'a que 4 lignes). Le tableau aura donc au moins 1 ligne et au plus 6 lignes (car on EXCLU le dimanche). Pour les calculs, il me semble que c'est correcte donc on change rien.
- Dans cette page, nous avons un toggle div.recap-filter qui sert à afficher une liste par semaine dans le tableau, ici rien ne change.