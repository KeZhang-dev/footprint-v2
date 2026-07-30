using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Footprint.Models;

namespace Footprint.Data;

public class FootprintDbContext : IdentityDbContext<ApplicationUser>
{
    public FootprintDbContext(DbContextOptions<FootprintDbContext> options) : base(options)
    {
    }

    public DbSet<Trip> Trips => Set<Trip>();

    public DbSet<TripPhoto> TripPhotos => Set<TripPhoto>();

    public DbSet<Like> Likes => Set<Like>();

    public DbSet<Favorite> Favorites => Set<Favorite>();

    public DbSet<Comment> Comments => Set<Comment>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Like>(entity =>
        {
            entity.HasKey(l => new { l.UserId, l.TripId });
            entity.HasOne(l => l.Trip).WithMany(t => t.Likes)
                .HasForeignKey(l => l.TripId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(l => l.User).WithMany()
                .HasForeignKey(l => l.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Favorite>(entity =>
        {
            entity.HasKey(f => new { f.UserId, f.TripId });
            entity.HasOne(f => f.Trip).WithMany(t => t.Favorites)
                .HasForeignKey(f => f.TripId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(f => f.User).WithMany()
                .HasForeignKey(f => f.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Comment>(entity =>
        {
            entity.HasIndex(c => c.TripId);
            entity.HasOne(c => c.Trip).WithMany(t => t.Comments)
                .HasForeignKey(c => c.TripId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(c => c.User).WithMany()
                .HasForeignKey(c => c.UserId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
