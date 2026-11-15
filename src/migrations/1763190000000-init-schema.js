module.exports = class InitSchema1763190000000 {
  name = 'InitSchema1763190000000';

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" SERIAL NOT NULL,
        "email" character varying(255) NOT NULL,
        "password" character varying(255) NOT NULL,
        "name" character varying(50) NOT NULL,
        "role" character varying(10) NOT NULL DEFAULT 'member',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "uq_users_email" UNIQUE ("email"),
        CONSTRAINT "ck_users_role" CHECK ("role" IN ('member', 'admin')),
        CONSTRAINT "pk_users" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" SERIAL NOT NULL,
        "name" character varying(50) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "uq_categories_name" UNIQUE ("name"),
        CONSTRAINT "pk_categories" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" SERIAL NOT NULL,
        "name" character varying(100) NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "price" integer NOT NULL,
        "image_url" character varying(500) NOT NULL,
        "category_id" integer NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "ck_products_price" CHECK ("price" >= 0),
        CONSTRAINT "pk_products" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_products_category_id" ON "products" ("category_id")`);
    await queryRunner.query(`
      CREATE TABLE "cart_items" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "product_id" integer NOT NULL,
        "quantity" integer NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "uq_cart_items_user_product" UNIQUE ("user_id", "product_id"),
        CONSTRAINT "ck_cart_items_quantity" CHECK ("quantity" >= 1),
        CONSTRAINT "pk_cart_items" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_cart_items_product_id" ON "cart_items" ("product_id")`);
    await queryRunner.query(`
      ALTER TABLE "products" ADD CONSTRAINT "fk_products_category"
      FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "cart_items" ADD CONSTRAINT "fk_cart_items_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "cart_items" ADD CONSTRAINT "fk_cart_items_product"
      FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE "cart_items"`);
    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(`DROP TABLE "categories"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
};
