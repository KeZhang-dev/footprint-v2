using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using Footprint.Data;
using Footprint.Models;
using Footprint.Services;

// WebApplication.CreateBuilder(args) wires up its default appsettings.json/
// appsettings.{Environment}.json sources with reloadOnChange: true before
// any of our code runs, which registers a FileSystemWatcher (inotify on
// Linux) as part of the CreateBuilder call itself - too early to disable
// by touching builder.Configuration afterward. The only hook that lands
// before that happens is the "hostBuilder:reloadConfigOnChange" bootstrap
// switch, read from the same command-line args passed into CreateBuilder.
// This app never edits its config files at runtime, so hot-reload buys
// nothing, and Render's containers run under a low per-user inotify
// instance limit that this watcher can exhaust (crashing startup with
// "System.IO.IOException: The configured user limit ... on the number of
// inotify instances has been reached").
var builder = WebApplication.CreateBuilder(
    [.. args, "--hostBuilder:reloadConfigOnChange=false"]);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddDbContext<FootprintDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("FootprintDb")));


// 区分权限，使用IdentityCore来管理用户和角色
builder.Services
    .AddIdentityCore<ApplicationUser>(options =>
    {
        options.Password.RequiredLength = 8;
        options.User.RequireUniqueEmail = true;
    })
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<FootprintDbContext>();

var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSection["Key"] ?? throw new InvalidOperationException("Jwt:Key is not configured.");

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtSection["Issuer"],
            ValidateAudience = true,
            ValidAudience = jwtSection["Audience"],
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.FromMinutes(1),
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddSingleton<IPhotoStorageService, PhotoStorageService>();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        // The Vite dev origin is always allowed. The deployed frontend's
        // origin (e.g. a Render static site) isn't known until Render
        // assigns it, so it's read from config instead of hardcoded -
        // set via the Cors__FrontendOrigin env var once that URL exists.
        var origins = new List<string> { "http://localhost:5173" };
        var frontendOrigin = builder.Configuration["Cors:FrontendOrigin"];
        if (!string.IsNullOrWhiteSpace(frontendOrigin))
        {
            origins.Add(frontendOrigin);
        }

        policy.WithOrigins([.. origins])
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

// Migrations, role seeding, and the admin account seed run in every
// environment (not just Development) so a fresh deploy - e.g. Render, with
// an empty SQLite file and no manual migration step - comes up with a
// working schema and a usable Admin login out of the box. Seeding a
// hardcoded admin@footprint.com / Admin123! account into what an
// environment check would otherwise treat as "production" is only
// acceptable because this app is a demo/MSA submission with no real user
// data at stake, not an actual production service. If that ever changes,
// this needs a real one-time promotion flow instead.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<FootprintDbContext>();
    db.Database.Migrate();

    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    foreach (var role in new[] { "User", "Admin" })
    {
        if (!await roleManager.RoleExistsAsync(role))
        {
            await roleManager.CreateAsync(new IdentityRole(role));
        }
    }

    // 这个userManager是IdentityCore的UserManager，用于管理用户，也是触发hash密码的地方
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
    const string adminEmail = "admin@footprint.com";
    if (await userManager.FindByEmailAsync(adminEmail) is null)
    {
        var admin = new ApplicationUser
        {
            UserName = adminEmail,
            Email = adminEmail,
            DisplayName = "Admin",
        };

        var createResult = await userManager.CreateAsync(admin, "Admin123!");
        if (createResult.Succeeded)
        {
            await userManager.AddToRoleAsync(admin, "Admin");
        }
    }
}

app.UseHttpsRedirection();

app.UseStaticFiles();

app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
