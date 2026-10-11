using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Purchase.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddStoneNameShapeMastersAndCategoryCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "short_code",
                table: "item_category",
                type: "character varying(6)",
                maxLength: 6,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "diamond_shape",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_diamond_shape", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "stone_name",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_stone_name", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_diamond_shape_name",
                table: "diamond_shape",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_stone_name_name",
                table: "stone_name",
                column: "name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "diamond_shape");

            migrationBuilder.DropTable(
                name: "stone_name");

            migrationBuilder.DropColumn(
                name: "short_code",
                table: "item_category");
        }
    }
}
