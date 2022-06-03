// attaches event listeners to element and sets a mutation observer to watch the Cart to change, re-attaching event listeners
document.addEventListener("DOMContentLoaded", function() {
  if (document.getElementById('main-cart-items')) {
    skioCheckCart();
  }
});

// attaches event listener to custom event to check cart on cart update
document.addEventListener("cart:update", function() {
  skioCheckCart();
});

// money formatter
const skioMoneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: window?.Shopify?.currency?.active || 'USD',
});

// checks the cart for Box or in-box items; removes in-box items from the cart if their parent box has been removed
function skioCheckCart() {
  fetch('/cart.js')
    .then((response) => response.json())
    .then((response) => {
      let boxInfo = {};
      boxInfo['indexes'] = [];

      response.items.forEach((item) => {
        if (item.properties['_Skio_box_parent_index'] !== undefined) {
          if (boxInfo[item.properties['_Skio_box_parent_index']] == undefined) boxInfo[item.properties['_Skio_box_parent_index']] = [item];
          else boxInfo[item.properties['_Skio_box_parent_index']].push(item);
        }
        if (item.properties['_Skio_box_index'] !== undefined) boxInfo['indexes'].push(item.properties['_Skio_box_index']);
      });

      let remove;
      let total = 0;
      for (const [key, value] of Object.entries(boxInfo)) {
        if (key !== 'indexes' && !boxInfo['indexes'].includes(parseInt(key))) {
          remove = value;
        }
        else if (key !== 'indexes' && boxInfo['indexes'].includes(parseInt(key))) {
          total = 0;
          value.forEach(item => total += item.final_line_price);

          //to update original box price on cart page
          if (total > 0 && document.querySelector('.cart-item.skio-box.skio-box-' + (parseInt(key) + 1) + ' .cart-item__price-wrapper .price')) {
            document.querySelectorAll('.cart-item.skio-box.skio-box-' + (parseInt(key) + 1) + ' .cart-item__price-wrapper .price').forEach(el => el.innerHTML = skioMoneyFormatter.format(total / 100));
            document.querySelectorAll('.cart-item.skio-box.skio-box-' + (parseInt(key) + 1) + ' .product-option.price').forEach(el => el.innerHTML = skioMoneyFormatter.format(total / 100));
          }

        }
      }

      if (remove) {
        let updates = {};
        remove.forEach(item => updates[item.key] = 0 );

        fetch('/cart/update.js?sections=' + getSectionsToRender().map((section) => section.section).join(","), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ updates })
          })
          .then((response) => response.json())
          .then((response) => {
            if (response.items.length > 0) skioUpdateSections(response);
            else window.location.reload();
          })
          .catch((error) => {
            console.log('error removing items in missing box: ', error);
          });

      }
    })
    .catch((error) => {
      console.log("error fetching cart: ", error);
    });
}

// used to get the necessary sections to update with the Section Rendering API
function getSectionsToRender() {
  return [
    {
      id: 'main-cart-items',
      section: document.getElementById('main-cart-items').dataset.id,
      selector: '.js-contents',
    },
    {
      id: 'cart-icon-bubble',
      section: 'cart-icon-bubble',
      selector: '.shopify-section'
    },
    {
      id: 'cart-live-region-text',
      section: 'cart-live-region-text',
      selector: '.shopify-section'
    },
    {
      id: 'main-cart-footer',
      section: document.getElementById('main-cart-footer').dataset.id,
      selector: '.js-contents',
    }
  ];
}

// used to get an updated section's innerHTML with the Section Rendering API
function getSectionInnerHTML(html, selector) {
  return new DOMParser()
    .parseFromString(html, 'text/html')
    .querySelector(selector).innerHTML;
}

// used to update a section's innerHTML with the Section Rendering API
function skioUpdateSections(response) {

  console.log("skio update sections");

  getSectionsToRender().forEach((section => {
    const elementToReplace =
      document.getElementById(section.id).querySelector(section.selector) || document.getElementById(section.id);

    elementToReplace.innerHTML =
      getSectionInnerHTML(response.sections[section.section], section.selector);
  }));
  skioCheckCart();
}

// can call this globally to update the cart if needed
window.skioCheckCart = skioCheckCart;