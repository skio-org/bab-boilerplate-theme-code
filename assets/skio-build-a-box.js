// GET MAIN BOX PRODUCT
window.boxProduct = JSON.parse(document.querySelector('[data-product-json]').innerText);
  
const skio = {
  log() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('%c [skio]', 'color: #8770f2');
    console.log.apply(console, args);
  },

  error() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('%c [skio]', 'color: #ff0000');
    console.log.apply(console, args);
  }
};

const SkioBuildABox = (props) => {
  return {
    loading: true,

    shop: Shopify.shop,

    boxProduct: window.boxProduct,
    boxData: null,
    products: [],
    preloadProductCount: 3,
    quantityError: false,
    purchaseType: 'one-time', // subscription or one-time
    selectedSellingPlanName: null,

    options: {
      individualProductMax: 12,
      individualProductMin: 0,
    },

    moneyFormatter: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: window?.Shopify?.currency?.active || 'USD',
    }),

    get totalProductCount() {
      return this.products.reduce((acc, product) => {
        return acc + product.quantity;
      }, 0);
    },

    get prices() {

      let prices = this.products.reduce((acc, product) => {
        var variant = this.getSelectedVariant(product);
      
        if(this.purchaseType == 'subscription') {
          let selling_plan = this.getSellingPlanByName(this.selectedSellingPlanName, product, variant);
          let allocation = variant.selling_plan_allocations.find(x => x.selling_plan_id == selling_plan.id);

          var price = parseFloat(((allocation.price / 100) * product.quantity).toFixed(2));
          var compareAtPrice = parseFloat(((allocation.compare_at_price / 100) * product.quantity).toFixed(2));
        } else {
          var price = parseFloat(((variant.price / 100) * product.quantity).toFixed(2) );
          var compareAtPrice = parseFloat(((variant.compare_at_price / 100) * product.quantity).toFixed(2));
        }

        acc.price = acc.price + price;
        acc.compareAtPrice = acc.compareAtPrice + compareAtPrice;

        return acc;
      }, {
        price: 0,
        compareAtPrice: 0
      });

      if (prices.price > 0 && document.querySelector(".price-item.price-item--regular")) document.querySelector(".price-item.price-item--regular").innerHTML = this.moneyFormatter.format(prices.price);
      else if (prices.price == 0 && document.querySelector(".price-item.price-item--regular")) document.querySelector(".price-item.price-item--regular").innerHTML = this.moneyFormatter.format(19.50);
      return prices;

    },

    get weightInGrams() {
      return this.products.reduce((acc, product) => {
        const variant = this.getSelectedVariant(product);
        return acc + (variant.weight * product.quantity);
      }, 0);
    },

    convertID(uuid) {
      return this.variantMap[uuid];
    },

    convertOptionLabel(label) {
      return label.replace("(BOX)", "");
    },

    getProductDataByHandle(handle) {
      return new Promise((resolve, reject) => {
        fetch(`https://${ this.shop }/products/${ handle }.js`)
        .then((response) => response.json())
        .then((response) => {
          resolve(response);
        })
        .catch((error) => {
          reject(error);
        });
      });
    },

    async getBoxData() {
      skio.log('Getting Box Data');

      await fetch(`https://api.skio.com/storefront-http/get-boxes-by-domain-or-hostname?domain=${ this.shop }`)
      .then((response) => response.json())
      .then((response) => {
        let boxes = response.Boxes;
        this.variantMap = response.variantIDMap;
        this.boxData = boxes.find(box => this.boxProduct.variants.find(variant => this.convertID(box.ProductVariant.id).platformId.includes(variant.id)))
        this.minMax = this.boxData.root.boxOptions[0].child.cycles[0].productGroups[0].option.minMax;

        skio.log('Box Data Received', this.boxData);
      })
      .catch((error) => {
        skio.error(error);
      });
    },

    async getProductData() {
      if(this.boxData) {
        let queryProductHandles = [];

        let boxVariants = this.boxData.root.boxOptions[0].child.cycles[0].productGroups[0].products.map(x => this.convertID(x.billableProductVariant));
        let handles = [ ...new Set(boxVariants.map(x => x.slug)) ];

        skio.log('Product Handles', handles);

        let queryAllProductData = [];
        
        handles.forEach((handle) => {
          queryAllProductData.push(this.getProductDataByHandle(handle))
        });

        await Promise.all(queryAllProductData)
        .then((products) => {
          skio.log('All Product Data', products);

          this.selectedSellingPlanName = this.boxProduct.selling_plan_groups.find(x => x.app_id == 'SKIO').options[0].values[0];

          products.forEach((product) => {
            product.quantity = 2;
            product.variants = product.variants.filter(x => boxVariants.find(y => y.platformId.includes(x.id)))

            product.selectedOptions = [];
            product.options.forEach((option) => {
              product.selectedOptions[option.name] = option.values[0];
            });
          });

          this.products = products;
          this.loading = false;
          
          skio.log('Box Product Data', this.boxProduct);
          skio.log('Formatted & Filtered Product Data', this.products);
        })
        .catch((errors) => {
          skio.error(errors);
        });
      }
    },

    getSelectedVariant(product) {
      if(!product.selectedOptions) return false;

      return product.variants.find((variant) => {
        return Object.values(product.selectedOptions).every((value, index) => variant.options[index] == value);
      });
    },

    getSellingPlanByName(name, product, variant) {
      let availableSellingPlanGroups = product.selling_plan_groups.filter(x => x.app_id == 'SKIO');
      let validSellingPlanGroups = availableSellingPlanGroups.filter(x => x.options.find(y => y.name.includes(variant.id)));
      console.log("valid selling plan groups: ", validSellingPlanGroups);
      let selectedSellingPlanGroup = validSellingPlanGroups.find(group => group.selling_plans.find(plan => plan.name == name));
      console.log("selected selling plan group: ", selectedSellingPlanGroup);
      let selling_plan = selectedSellingPlanGroup.selling_plans.find(x => x.name == name);
      if (!selling_plan) skio.log("error: selling plan could not be found: ", name, product, variant, selling_plan);
      return selling_plan;
    },

    updateQuantity(product, value, event = null) {
      if(event) {
        var newQuantity = value;
        event.target.value = Math.min(Math.max(newQuantity, this.options.individualProductMin), this.options.individualProductMax);
      } else {
        var newQuantity = product.quantity + value;
      }

      const totalProductCount = this.products.reduce((accumulator, object) => {
        return accumulator + (object == product ? newQuantity : object.quantity);
      }, 0);
      if(this.minMAx) this.quantityError = totalProductCount < this.minMax.min ? true : false;

      product.quantity = Math.min(Math.max(newQuantity, this.options.individualProductMin), this.options.individualProductMax);
    },

    async addToCart() {
      skio.log('Add to Cart');

      let box_index = 0;

      await fetch('/cart.js')
        .then((response) => response.json())
        .then((response) => {
          response.items.forEach((item) => {
            if (item.properties['_Skio_box_index'] !== undefined) {
              if (parseInt(item.properties['_Skio_box_index']) >= box_index) {
                box_index = parseInt(item.properties['_Skio_box_index']) + 1;
              }
            }
          });
        })
        .catch((error) => {
          console.log("error fetching cart: ", error);
        });

      let items = [];

      let boxProperty = JSON.parse(JSON.stringify({
        quickstart_root_option_group: "root_option",
        root_cycle_group: "root_cycle",
        productGroups: this.boxData.root.boxOptions[0].child.cycles[0].productGroups[0]
      }));

      await this.products.forEach((product) => {
        let variant = this.getSelectedVariant(product);
        let quantity = product.quantity;
        let selling_plan = this.getSellingPlanByName(this.selectedSellingPlanName, product, variant);

        boxProperty.productGroups.products.find(x => this.convertID(x.billableProductVariant).platformId.includes(variant.id)).quantity = quantity;

        items.push({
          id: variant.id,
          quantity,
          ...(this.purchaseType == 'subscription' && { selling_plan: selling_plan.id }),
          properties: {
            _Skio_box_parent: this.boxProduct.id,
            _Skio_box_parent_index: box_index
          }
        });
      });

      // if(this.purchaseType == 'subscription') {
      //   let product = this.boxProduct;
      //   let variant = product.variants[0];
      //   let selling_plan = this.getSellingPlanByName(this.selectedSellingPlanName, product, variant);

      //   items.push({
      //     id: variant.id,
      //     quantity: 1,
      //     selling_plan: selling_plan.id,
      //     properties: {
      //       _Skio_box: JSON.stringify(boxProperty),
      //       _Skio_box_index: box_index
      //     }
      //   })
      // }

      if(this.purchaseType == 'subscription' || this.purchaseType == 'one-time') {
          let product = this.boxProduct;
          let variant = product.variants[0];
          let selling_plan = this.getSellingPlanByName(this.selectedSellingPlanName, product, variant);
  
          items.push({
            id: variant.id,
            quantity: 1,
            ...(this.purchaseType == 'subscription' && { selling_plan: selling_plan.id }),
            properties: {
              _Skio_box: JSON.stringify(boxProperty),
              _Skio_box_index: box_index
            }
          })
        }

      fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items })
      })
      .then((response) => response.json())
      .then((response) => {
        skio.log(response);
        window.location = '/cart';
      })
      .catch((error) => {
        skio.error(error);
      }) 
    },

    addEventListeners() {
      const vm = this;
      document.querySelectorAll('form[action="/cart/add"] button[type="submit"]').forEach((button) => {
        button.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          skio.log('adding to cart');
          vm.addToCart();
        })
      })
    },

    async mounted() {
      skio.log('Build a Box Mounted');
      await this.getBoxData();
      await this.getProductData();
      //add in connect to event listener
      this.addEventListeners();
      this.loading = false;
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.SkioBuildABox = PetiteVue.createApp({ 
    $delimiters: ['{', '}'], 
    SkioBuildABox 
  }).mount('#BuildABox')
});